import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Pool } from "pg";
import { createDb, schema, type Db } from "@11ftc/db";
import { normalizeName, TicketStatus, UserRole, type DatePoint, type FirstTimeFixDto } from "@11ftc/shared";
import { AnalyticsService } from "./analytics.service.js";

/**
 * M9 gating tests (FR-21/23), against a REAL Postgres. Tickets are inserted inside a
 * transaction we ROLL BACK (they are never deleted — FR-9). Windowed to a far-future month
 * so the assertions hold regardless of any other data in the table.
 */
process.loadEnvFile?.(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../..", ".env"),
);

const TEST_DEPT = "__M9_TEST_DEPT__";
const TEST_ISSUE = "__M9_TEST_ISSUE__";
const TEST_EMAIL = "__m9_actor__@example.com";
const TEST_EMP = "Analytics Test Reporter";

class RollbackSignal extends Error {}

let db: Db;
let pool: Pool;
let employeeId: string;
let mainIssueId: string;
let userId: string;

async function cleanup(): Promise<void> {
  await db
    .delete(schema.employees)
    .where(eq(schema.employees.nameNormalized, normalizeName(TEST_EMP)));
  await db.delete(schema.departments).where(eq(schema.departments.name, TEST_DEPT));
  await db.delete(schema.mainIssueCategory).where(eq(schema.mainIssueCategory.label, TEST_ISSUE));
  await db.delete(schema.users).where(eq(schema.users.email, TEST_EMAIL));
}

beforeAll(async () => {
  const conn = createDb(process.env.DATABASE_URL);
  db = conn.db;
  pool = conn.pool;
  await cleanup();

  const [dept] = await db.insert(schema.departments).values({ name: TEST_DEPT }).returning();
  const [emp] = await db
    .insert(schema.employees)
    .values({ name: TEST_EMP, nameNormalized: normalizeName(TEST_EMP), departmentId: dept!.departmentId })
    .returning();
  const [issue] = await db
    .insert(schema.mainIssueCategory)
    .values({ label: TEST_ISSUE })
    .returning();
  const [user] = await db
    .insert(schema.users)
    .values({ email: TEST_EMAIL, fullName: "Analytics Actor", role: UserRole.IT_STAFF })
    .returning();
  if (!dept || !emp || !issue || !user) throw new Error("failed to create M9 fixtures");
  employeeId = emp.employeeId;
  mainIssueId = issue.mainIssueId;
  userId = user.userId;
});

afterAll(async () => {
  if (db) await cleanup();
  if (pool) await pool.end();
});

async function catchRollback(p: Promise<unknown>): Promise<void> {
  try {
    await p;
  } catch (e) {
    if (!(e instanceof RollbackSignal)) throw e;
  }
}

describe("M9 analytics", () => {
  it("solved buckets by closed_at (not updated_at); first-time-fix excludes Ongoing (FR-21/23)", async () => {
    let solved: DatePoint[] = [];
    let ftf: FirstTimeFixDto | undefined;

    await catchRollback(
      db.transaction(async (tx) => {
        await tx.insert(schema.ticketSequence).values({ scopeKey: "2099", lastSequence: 2 });

        const base = {
          date: "2099-06-15",
          sequenceScope: "2099",
          employeeId,
          mainIssueId,
          concern: "analytics fixture",
          createdBy: userId,
          status: TicketStatus.CLOSED,
        };
        // A — closed directly (first-time fix). Closed in June; "edited" (updated) in August.
        await tx.insert(schema.tickets).values({
          ...base,
          ticketNo: "IT-2099-0001",
          sequenceNumber: 1,
          ongoingAt: null,
          closedAt: new Date("2099-06-15T10:00:00Z"),
          updatedAt: new Date("2099-08-01T10:00:00Z"),
        });
        // B — went Open → Ongoing → Closed (NOT first-time fix). Closed in June.
        await tx.insert(schema.tickets).values({
          ...base,
          ticketNo: "IT-2099-0002",
          sequenceNumber: 2,
          ongoingAt: new Date("2099-06-18T10:00:00Z"),
          closedAt: new Date("2099-06-20T10:00:00Z"),
          updatedAt: new Date("2099-06-20T10:00:00Z"),
        });

        const svc = new AnalyticsService(tx as unknown as Db);
        const w = { from: "2099-06-01", to: "2099-06-30", granularity: "day" } as const;
        solved = await svc.solved(w);
        ftf = await svc.firstTimeFix(w);
        throw new RollbackSignal();
      }),
    );

    // Both counted in June by closed_at — A's August edit does NOT move it out.
    const totalSolved = solved.reduce((sum, p) => sum + p.count, 0);
    expect(totalSolved).toBe(2);

    if (!ftf) throw new Error("analytics did not run");
    expect(ftf.closed).toBe(2);
    expect(ftf.firstTimeFix).toBe(1); // only A (closed without ever going Ongoing)
    expect(ftf.rate).toBe(0.5);
  });

  /**
   * REGRESSION: every granularity must actually EXECUTE.
   *
   * `date_trunc(<granularity>, …)` appears in SELECT, GROUP BY and ORDER BY. Bound as a
   * parameter it becomes `$1`/`$2`/`$3` — three syntactically different expressions to the
   * planner — and Postgres rejects the query with "column tickets.date must appear in the
   * GROUP BY clause". Nothing catches that without a real database: the types are fine, the
   * SQL string looks fine, and the dashboard's `Promise.all` turns the 500 into a silently
   * blank page. Hence a real-Postgres test that simply runs all three.
   */
  it("volume and solved execute at every granularity (day/week/month)", async () => {
    const svc = new AnalyticsService(db);
    const w = { from: "2099-06-01", to: "2099-06-30" } as const;

    for (const granularity of ["day", "week", "month"] as const) {
      await expect(svc.volume({ ...w, granularity })).resolves.toBeInstanceOf(Array);
      await expect(svc.solved({ ...w, granularity })).resolves.toBeInstanceOf(Array);
    }
  });

  /** Month buckets must land on the 1st — the axis labels and the API must agree. */
  it("month buckets are calendar-aligned to the 1st", async () => {
    let points: DatePoint[] = [];

    await catchRollback(
      db.transaction(async (tx) => {
        await tx.insert(schema.ticketSequence).values({ scopeKey: "2099", lastSequence: 1 });
        await tx.insert(schema.tickets).values({
          ticketNo: "IT-2099-0003",
          date: "2099-06-15", // mid-month
          sequenceScope: "2099",
          sequenceNumber: 1,
          employeeId,
          mainIssueId,
          concern: "bucket alignment fixture",
          createdBy: userId,
          status: TicketStatus.CLOSED,
          closedAt: new Date("2099-06-15T10:00:00Z"),
        });

        const svc = new AnalyticsService(tx as unknown as Db);
        points = await svc.volume({ from: "2099-06-01", to: "2099-06-30", granularity: "month" });
        throw new RollbackSignal();
      }),
    );

    expect(points).toHaveLength(1);
    expect(points[0]?.date).toBe("2099-06-01"); // NOT 2099-06-15
  });
});

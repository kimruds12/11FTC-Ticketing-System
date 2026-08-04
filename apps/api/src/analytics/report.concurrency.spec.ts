import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Pool } from "pg";
import { createDb, schema, type Db } from "@11ftc/db";
import {
  normalizeName,
  TicketStatus,
  UserRole,
  type ReportMatrixDto,
} from "@11ftc/shared";
import { AnalyticsService } from "./analytics.service.js";

/**
 * Report cross-tab gating tests (FR-36/37), against a REAL Postgres.
 *
 * The pivot is the part that cannot be checked by types: counts are placed by looking up a
 * bucket string in a Map and indexing an array, so an off-by-one or a mismatched key puts a
 * real number in the wrong cell and the table still renders perfectly. These tests pin the
 * cells, not just the totals.
 *
 * Fixtures are inserted in a transaction that is ROLLED BACK (tickets are never deleted —
 * FR-9) and dated to a far-future month, so assertions hold whatever else is in the table.
 *
 * The `.concurrency.spec.ts` suffix is this repo's marker for "needs a real Postgres" (see
 * vitest.concurrency.config.ts) — `pnpm test` stays DB-free. Nothing here is about
 * concurrency.
 */
process.loadEnvFile?.(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../..", ".env"),
);

const DEPT_A = "__RPT_TEST_DEPT_A__";
const DEPT_B = "__RPT_TEST_DEPT_B__";
const DEPT_EMPTY = "__RPT_TEST_DEPT_EMPTY__";
const ISSUE_X = "__RPT_TEST_ISSUE_X__";
const ISSUE_Y = "__RPT_TEST_ISSUE_Y__";
const EMP_A = "Report Fixture Reporter A";
const EMP_B = "Report Fixture Reporter B";
const EMAIL = "__rpt_actor__@example.com";

const WINDOW = { from: "2099-06-01", to: "2099-07-31", granularity: "month" } as const;
const JUNE = "2099-06-01";
const JULY = "2099-07-01";

class RollbackSignal extends Error {}

let db: Db;
let pool: Pool;
const ids = {
  deptA: "",
  deptB: "",
  empA: "",
  empB: "",
  issueX: "",
  issueY: "",
  user: "",
};

async function cleanup(): Promise<void> {
  await db
    .delete(schema.employees)
    .where(inArray(schema.employees.nameNormalized, [normalizeName(EMP_A), normalizeName(EMP_B)]));
  await db
    .delete(schema.departments)
    .where(inArray(schema.departments.name, [DEPT_A, DEPT_B, DEPT_EMPTY]));
  await db
    .delete(schema.mainIssueCategory)
    .where(inArray(schema.mainIssueCategory.label, [ISSUE_X, ISSUE_Y]));
  await db.delete(schema.users).where(eq(schema.users.email, EMAIL));
}

beforeAll(async () => {
  const conn = createDb(process.env.DATABASE_URL);
  db = conn.db;
  pool = conn.pool;
  await cleanup();

  const [a, b, empty] = await db
    .insert(schema.departments)
    .values([{ name: DEPT_A }, { name: DEPT_B }, { name: DEPT_EMPTY }])
    .returning();
  const [x, y] = await db
    .insert(schema.mainIssueCategory)
    .values([{ label: ISSUE_X }, { label: ISSUE_Y }])
    .returning();
  const [user] = await db
    .insert(schema.users)
    .values({ email: EMAIL, fullName: "Report Actor", role: UserRole.IT_STAFF })
    .returning();
  if (!a || !b || !empty || !x || !y || !user) throw new Error("failed to create fixtures");

  const [ea, eb] = await db
    .insert(schema.employees)
    .values([
      { name: EMP_A, nameNormalized: normalizeName(EMP_A), departmentId: a.departmentId },
      { name: EMP_B, nameNormalized: normalizeName(EMP_B), departmentId: b.departmentId },
    ])
    .returning();
  if (!ea || !eb) throw new Error("failed to create employee fixtures");

  ids.deptA = a.departmentId;
  ids.deptB = b.departmentId;
  ids.empA = ea.employeeId;
  ids.empB = eb.employeeId;
  ids.issueX = x.mainIssueId;
  ids.issueY = y.mainIssueId;
  ids.user = user.userId;
});

afterAll(async () => {
  if (db) await cleanup();
  if (pool) await pool.end();
});

/**
 * Seed four tickets and run `body` against the same transaction, then roll back.
 *
 *   dept A: June ×2 (issue X), July ×1 (issue Y)
 *   dept B: July ×1 (issue X)
 *   dept EMPTY: nothing — it exists only to prove a zero row is still rendered.
 */
async function withFixtures(body: (svc: AnalyticsService, tx: Db) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await tx.insert(schema.ticketSequence).values({ scopeKey: "2099", lastSequence: 4 });
      const base = {
        sequenceScope: "2099",
        createdBy: ids.user,
        concern: "report fixture",
        status: TicketStatus.CLOSED,
      };
      await tx.insert(schema.tickets).values([
        { ...base, ticketNo: "IT-2099-9001", sequenceNumber: 1, date: "2099-06-15", employeeId: ids.empA, mainIssueId: ids.issueX },
        { ...base, ticketNo: "IT-2099-9002", sequenceNumber: 2, date: "2099-06-20", employeeId: ids.empA, mainIssueId: ids.issueX },
        { ...base, ticketNo: "IT-2099-9003", sequenceNumber: 3, date: "2099-07-10", employeeId: ids.empA, mainIssueId: ids.issueY },
        { ...base, ticketNo: "IT-2099-9004", sequenceNumber: 4, date: "2099-07-11", employeeId: ids.empB, mainIssueId: ids.issueX },
      ]);
      await body(new AnalyticsService(tx as unknown as Db), tx as unknown as Db);
      throw new RollbackSignal();
    });
  } catch (e) {
    if (!(e instanceof RollbackSignal)) throw e;
  }
}

function row(m: ReportMatrixDto, key: string): { counts: number[]; total: number } {
  const found = m.rows.find((r) => r.key === key);
  if (!found) throw new Error(`no report row for ${key} (rows: ${m.rows.map((r) => r.key).join(", ")})`);
  return found;
}

/** Column index of a bucket, so assertions never depend on how many other buckets exist. */
function col(m: ReportMatrixDto, bucket: string): number {
  const i = m.buckets.indexOf(bucket);
  if (i < 0) throw new Error(`no ${bucket} bucket (buckets: ${m.buckets.join(", ")})`);
  return i;
}

describe("report cross-tab (FR-36)", () => {
  it("places each count in the right department row and period column", async () => {
    await withFixtures(async (svc) => {
      const m = await svc.report(WINDOW);

      expect(m.buckets).toEqual([JUNE, JULY]);

      const a = row(m, DEPT_A);
      expect(a.counts[col(m, JUNE)]).toBe(2);
      expect(a.counts[col(m, JULY)]).toBe(1);
      expect(a.total).toBe(3);

      const b = row(m, DEPT_B);
      expect(b.counts[col(m, JUNE)]).toBe(0);
      expect(b.counts[col(m, JULY)]).toBe(1);
      expect(b.total).toBe(1);
    });
  });

  /**
   * The report's central claim. `tickets.employee_id` and `employees.department_id` are both
   * NOT NULL, so the inner joins cannot drop a ticket and the grand total must equal a plain
   * count over the same window. If someone later makes either column nullable, this fails
   * here rather than as a report that quietly under-reports in a meeting.
   */
  it("grand total reconciles exactly with the ticket count in the window", async () => {
    await withFixtures(async (svc, tx) => {
      const m = await svc.report(WINDOW);
      const [counted] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.tickets)
        .where(
          sql`${schema.tickets.date} >= ${WINDOW.from} and ${schema.tickets.date} <= ${WINDOW.to}`,
        );

      expect(m.grandTotal).toBe(counted?.n);
      expect(m.rows.reduce((s, r) => s + r.total, 0)).toBe(m.grandTotal);
      expect(m.columnTotals.reduce((s, c) => s + c, 0)).toBe(m.grandTotal);
    });
  });

  /**
   * A report is a fixed-shape document. A department that filed nothing this period must
   * still occupy a row — otherwise it looks like it was removed from the system rather than
   * simply quiet, and two months' reports stop being comparable side by side.
   */
  it("keeps a zero row for an active department with no tickets", async () => {
    await withFixtures(async (svc) => {
      const m = await svc.report(WINDOW);
      const empty = row(m, DEPT_EMPTY);
      expect(empty.total).toBe(0);
      expect(empty.counts).toEqual(m.buckets.map(() => 0));
    });
  });

  it("narrows to one department when departmentId is given", async () => {
    await withFixtures(async (svc) => {
      const m = await svc.report({ ...WINDOW, departmentId: ids.deptA });
      expect(m.rows.map((r) => r.key)).toEqual([DEPT_A]);
      expect(m.grandTotal).toBe(3);
    });
  });

  it("narrows by main issue across every department", async () => {
    await withFixtures(async (svc) => {
      const m = await svc.report({ ...WINDOW, mainIssueId: ids.issueX });
      // A's July ticket is issue Y, so it drops out; B's July ticket is X and stays.
      expect(row(m, DEPT_A).counts[col(m, JUNE)]).toBe(2);
      expect(row(m, DEPT_A).total).toBe(2);
      expect(row(m, DEPT_B).total).toBe(1);
      expect(m.grandTotal).toBe(3);
    });
  });

  /** Columns come from the data, so an all-quiet period is absent rather than a zero column. */
  it("emits no column for a period with no tickets", async () => {
    await withFixtures(async (svc) => {
      const m = await svc.report({ from: "2099-06-01", to: "2099-12-31", granularity: "month" });
      expect(m.buckets).toEqual([JUNE, JULY]); // not Aug..Dec
    });
  });

  it("executes at every granularity", async () => {
    await withFixtures(async (svc) => {
      for (const granularity of ["day", "week", "month"] as const) {
        const m = await svc.report({ ...WINDOW, granularity });
        expect(m.grandTotal).toBe(4);
      }
    });
  });
});

describe("report coverage (FR-37)", () => {
  it("reports the newest encoded date, ignoring filters", async () => {
    await withFixtures(async (svc) => {
      const c = await svc.coverage();
      expect(c.to).toBe("2099-07-11"); // the latest fixture
      expect(c.total).toBeGreaterThanOrEqual(4);
      expect(c.from).not.toBeNull();
    });
  });
});

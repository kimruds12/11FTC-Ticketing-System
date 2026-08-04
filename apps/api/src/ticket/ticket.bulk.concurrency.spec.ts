import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Pool } from "pg";
import { createDb, schema, type Db } from "@11ftc/db";
import { UserRole, type AuthContext, type EncodeTicketDto } from "@11ftc/shared";
import { TicketService } from "./ticket.service.js";
import { TicketRepository } from "./ticket.repository.js";
import { NumberingService } from "../numbering/numbering.service.js";
import { EmployeeService } from "../employee/employee.service.js";
import { TechnicianService } from "../technician/technician.service.js";
import { AuditService } from "../audit/audit.service.js";
import { OutboxService } from "../outbox/outbox.service.js";

/**
 * FR-39 — bulk encode is ATOMIC. Against a REAL Postgres.
 *
 * This suite deliberately never commits a ticket. The claim worth proving is the failure
 * path — one rejected row writes nothing — and that path rolls itself back, so it leaves the
 * database exactly as it found it. The success path is exercised through `encodeTx` inside a
 * transaction this test rolls back, which is the same code `encodeBulk` runs in its loop;
 * committing real tickets to assert on them would be permanent, because nothing is ever
 * deleted (FR-9) and this points at the live database.
 */
process.loadEnvFile?.(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../..", ".env"),
);

const TEST_DEPT = "__BULK_TEST_DEPT__";
const TEST_ISSUE = "__BULK_TEST_ISSUE__";
const TEST_EMAIL = "__bulk_actor__@example.com";
const SCOPE = "2098";
const EMPLOYEE_NAMES = ["bulk reporter a", "bulk reporter b", "bulk reporter c"];

class RollbackSignal extends Error {}

let db: Db;
let pool: Pool;
let service: TicketService;
let deptId: string;
let mainIssueId: string;
let actorUserId: string;

async function cleanup(): Promise<void> {
  await db
    .delete(schema.employees)
    .where(inArray(schema.employees.nameNormalized, EMPLOYEE_NAMES));
  await db.delete(schema.ticketSequence).where(eq(schema.ticketSequence.scopeKey, SCOPE));
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
  const [issue] = await db
    .insert(schema.mainIssueCategory)
    .values({ label: TEST_ISSUE })
    .returning();
  const [user] = await db
    .insert(schema.users)
    .values({ email: TEST_EMAIL, fullName: "Bulk Actor", role: UserRole.IT_STAFF })
    .returning();
  if (!dept || !issue || !user) throw new Error("failed to create bulk fixtures");

  deptId = dept.departmentId;
  mainIssueId = issue.mainIssueId;
  actorUserId = user.userId;

  service = new TicketService(
    db,
    new TicketRepository(db),
    new NumberingService("year"),
    new EmployeeService(db),
    new TechnicianService(db),
    new AuditService(db),
    new OutboxService(),
  );
});

afterAll(async () => {
  if (db) await cleanup();
  if (pool) await pool.end();
});

function actor(): AuthContext {
  return {
    userId: actorUserId,
    role: UserRole.IT_STAFF,
    fullName: "Bulk Actor",
    email: TEST_EMAIL,
  };
}

function row(name: string, overrides: Partial<EncodeTicketDto> = {}): EncodeTicketDto {
  return {
    date: `${SCOPE}-03-04`,
    employeeName: name,
    departmentId: deptId,
    mainIssueId,
    concern: "bulk fixture concern",
    status: "Closed" as EncodeTicketDto["status"],
    assignees: [],
    remarks: null,
    ...overrides,
  };
}

/** How many tickets exist in the test's own numbering scope. */
async function countInScope(): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.tickets)
    .where(eq(schema.tickets.sequenceScope, SCOPE));
  return r?.n ?? 0;
}

describe("bulk encode (FR-39)", () => {
  /**
   * THE claim. A batch is one transaction, so a row the database refuses must take the whole
   * batch with it. If this ever regresses, the encoder gets a partial batch they cannot
   * delete (FR-9) and no reliable way to know which rows landed — they would re-enter the
   * ones they think are missing and create duplicates.
   */
  it("writes NOTHING when one row in the batch is rejected", async () => {
    expect(await countInScope()).toBe(0);

    const batch = [
      row("Bulk Reporter A"),
      row("Bulk Reporter B"),
      // Valid shape (the DTO passed), but no such main issue — the FK rejects it at insert.
      row("Bulk Reporter C", { mainIssueId: "00000000-0000-4000-8000-000000000000" }),
    ];

    await expect(service.encodeBulk(batch, actor())).rejects.toThrow();

    // Not "fewer than 3" — ZERO. The two good rows must not survive the third.
    expect(await countInScope()).toBe(0);

    // The employees named only by the failed batch must not survive it either; they are
    // resolve-or-created inside the SAME transaction (M4).
    const [emp] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.employees)
      .where(inArray(schema.employees.nameNormalized, EMPLOYEE_NAMES));
    expect(emp?.n).toBe(0);
  });

  /**
   * The sequence must not be left holding numbers for tickets that do not exist as a
   * *duplicate* risk. Gaps are fine and expected (M3 invariant 5) — this asserts the batch
   * did not leave the scope row claiming rows it never created.
   */
  it("leaves no ticket rows behind for the numbers it consumed", async () => {
    const [seq] = await db
      .select({ last: schema.ticketSequence.lastSequence })
      .from(schema.ticketSequence)
      .where(eq(schema.ticketSequence.scopeKey, SCOPE));

    // Whatever the counter says, there must be no ticket in this scope at all.
    const [t] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.tickets)
      .where(eq(schema.tickets.sequenceScope, SCOPE));
    expect(t?.n).toBe(0);
    // The rollback also reverted the sequence row itself, so it should not exist yet.
    expect(seq).toBeUndefined();
  });

  /**
   * The success path, driven through the same `encodeTx` the bulk loop calls, inside a
   * transaction this test rolls back. Proves the batch numbers CONSECUTIVELY — a bulk encode
   * that handed out non-sequential numbers would break the team's expectation that a batch
   * is a contiguous run on the sheet.
   */
  it("numbers a batch consecutively within one transaction", async () => {
    let numbers: string[] = [];

    try {
      await db.transaction(async (tx) => {
        const created = [];
        for (const name of ["Bulk Reporter A", "Bulk Reporter B", "Bulk Reporter C"]) {
          created.push(await service.encodeTx(row(name), actor(), tx));
        }
        numbers = created.map((c) => c.ticketNo);
        throw new RollbackSignal();
      });
    } catch (e) {
      if (!(e instanceof RollbackSignal)) throw e;
    }

    expect(numbers).toHaveLength(3);
    const seqs = numbers.map((n) => Number(n.split("-")[2]));
    expect(seqs[1]).toBe((seqs[0] ?? 0) + 1);
    expect(seqs[2]).toBe((seqs[0] ?? 0) + 2);
    // And nothing survived the rollback.
    expect(await countInScope()).toBe(0);
  });

  it("rejects an empty batch and one over the cap at the schema", async () => {
    const { bulkEncodeTicketSchema } = await import("@11ftc/shared");
    expect(bulkEncodeTicketSchema.safeParse({ tickets: [] }).success).toBe(false);
    expect(
      bulkEncodeTicketSchema.safeParse({
        tickets: Array.from({ length: 26 }, () => row("Bulk Reporter A")),
      }).success,
    ).toBe(false);
  });
});

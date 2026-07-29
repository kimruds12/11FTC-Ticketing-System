import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Pool } from "pg";
import { createDb, schema, type Db } from "@11ftc/db";
import { UserRole, type AuthContext, type EncodeTicketDto } from "@11ftc/shared";
import { TicketService } from "./ticket.service.js";
import { TicketRepository, type TicketRow } from "./ticket.repository.js";
import { NumberingService } from "../numbering/numbering.service.js";
import { EmployeeService } from "../employee/employee.service.js";
import { AuditService } from "../audit/audit.service.js";
import { OutboxService } from "../outbox/outbox.service.js";

/**
 * M5 gating tests — number + ticket + audit + outbox commit as ONE transaction. Runs against
 * a REAL Postgres. Every encode is driven inside a transaction we ROLL BACK, so no ticket or
 * audit row is ever created (and thus never needs deleting — FR-9). Only committed fixtures
 * (department, main issue, actor user) are cleaned up afterwards.
 */
process.loadEnvFile?.(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../..", ".env"),
);

const TEST_DEPT = "__M5_TEST_DEPT__";
const TEST_ISSUE = "__M5_TEST_ISSUE__";
const TEST_USER_EMAIL = "__m5_test_actor__@example.com";
const TEST_EMPLOYEE_NORMALIZED = ["m5 test reporter"];
const TEST_SCOPE_KEYS = ["2099"];

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
    .where(inArray(schema.employees.nameNormalized, TEST_EMPLOYEE_NORMALIZED));
  await db
    .delete(schema.ticketSequence)
    .where(inArray(schema.ticketSequence.scopeKey, TEST_SCOPE_KEYS));
  await db.delete(schema.departments).where(eq(schema.departments.name, TEST_DEPT));
  await db
    .delete(schema.mainIssueCategory)
    .where(eq(schema.mainIssueCategory.label, TEST_ISSUE));
  await db.delete(schema.users).where(eq(schema.users.email, TEST_USER_EMAIL));
}

beforeAll(async () => {
  const conn = createDb(process.env.DATABASE_URL);
  db = conn.db;
  pool = conn.pool;
  await cleanup();

  const [dept] = await db
    .insert(schema.departments)
    .values({ name: TEST_DEPT })
    .returning();
  const [issue] = await db
    .insert(schema.mainIssueCategory)
    .values({ label: TEST_ISSUE })
    .returning();
  const [user] = await db
    .insert(schema.users)
    .values({ email: TEST_USER_EMAIL, fullName: "M5 Test Actor", role: UserRole.IT_STAFF })
    .returning();
  if (!dept || !issue || !user) throw new Error("failed to create M5 fixtures");
  deptId = dept.departmentId;
  mainIssueId = issue.mainIssueId;
  actorUserId = user.userId;

  service = new TicketService(
    db,
    new TicketRepository(db),
    new NumberingService("year"),
    new EmployeeService(db),
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
    fullName: "M5 Test Actor",
    email: TEST_USER_EMAIL,
  };
}

function input(status: EncodeTicketDto["status"]): EncodeTicketDto {
  return {
    date: "2099-01-15",
    employeeName: "M5 Test Reporter",
    departmentId: deptId,
    mainIssueId,
    concern: "printer offline",
    status,
    assignedTo: null,
    remarks: null,
  };
}

async function catchRollback(p: Promise<unknown>): Promise<void> {
  try {
    await p;
  } catch (e) {
    if (!(e instanceof RollbackSignal)) throw e;
  }
}

describe("M5 encode — one transaction (number + ticket + audit + outbox)", () => {
  it("encode as Closed: closed_at set, ongoing_at NULL, 1 CREATE audit row, 1 PENDING outbox row", async () => {
    let captured:
      | {
          row: TicketRow;
          audit: (typeof schema.auditLog.$inferSelect)[];
          outbox: (typeof schema.syncOutbox.$inferSelect)[];
        }
      | undefined;

    await catchRollback(
      db.transaction(async (tx) => {
        const row = await service.encodeTx(input("Closed"), actor(), tx);
        const audit = await tx
          .select()
          .from(schema.auditLog)
          .where(eq(schema.auditLog.ticketId, row.ticketId));
        const outbox = await tx
          .select()
          .from(schema.syncOutbox)
          .where(eq(schema.syncOutbox.ticketId, row.ticketId));
        captured = { row, audit, outbox };
        throw new RollbackSignal();
      }),
    );

    const c = captured;
    if (!c) throw new Error("encode did not run");
    expect(c.row.status).toBe("Closed");
    expect(c.row.closedAt).not.toBeNull();
    expect(c.row.ongoingAt).toBeNull();
    expect(c.row.ticketNo).toMatch(/^IT-2099-\d{4}$/); // backdate → scope from encoded date
    expect(c.audit.length).toBe(1);
    expect(c.audit[0]?.action).toBe("CREATE");
    expect(c.outbox.length).toBe(1);
    expect(c.outbox[0]?.status).toBe("PENDING");
    expect(c.outbox[0]?.rowKey).toBe(c.row.ticketNo);
  });

  it("sets ongoing_at/closed_at per status, once (FR-1/7)", async () => {
    const cases: Array<[EncodeTicketDto["status"], boolean, boolean]> = [
      ["Open", false, false],
      ["Ongoing", true, false],
      ["Closed", false, true],
    ];
    for (const [status, ongoing, closed] of cases) {
      let row: TicketRow | undefined;
      await catchRollback(
        db.transaction(async (tx) => {
          row = await service.encodeTx(input(status), actor(), tx);
          throw new RollbackSignal();
        }),
      );
      if (!row) throw new Error("encode did not run");
      expect(row.ongoingAt !== null).toBe(ongoing);
      expect(row.closedAt !== null).toBe(closed);
    }
  });

  it("a rolled-back encode persists nothing — ticket AND outbox (same-transaction, FR-31)", async () => {
    let ticketId = "";
    let ticketNo = "";
    await catchRollback(
      db.transaction(async (tx) => {
        const row = await service.encodeTx(input("Closed"), actor(), tx);
        ticketId = row.ticketId;
        ticketNo = row.ticketNo;
        throw new RollbackSignal();
      }),
    );
    const t = await db
      .select()
      .from(schema.tickets)
      .where(eq(schema.tickets.ticketId, ticketId));
    const o = await db
      .select()
      .from(schema.syncOutbox)
      .where(eq(schema.syncOutbox.rowKey, ticketNo));
    expect(t.length).toBe(0);
    expect(o.length).toBe(0);
  });
});

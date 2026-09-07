import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Pool } from "pg";
import { createDb, schema, type Db } from "@11ftc/db";
import { EmployeeService } from "./employee.service.js";

/**
 * M4 gating tests — the dedup guarantee. Both need a REAL Postgres (the unique index and the
 * concurrent-create race can't be proven against a mock). Isolated to a test department +
 * fixed test names, cleaned up. `employees`/`departments` are not `tickets`/`audit_log`, so
 * DELETE here does not touch the no-delete rule.
 */
process.loadEnvFile?.(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../..", ".env"),
);

const TEST_DEPT = "__M4_TEST_DEPT__";
const TEST_NAMES = ["juan dela cruz", "maria santos"];
const CONCURRENCY = 20;

let db: Db;
let pool: Pool;
let deptId: string;
let svc: EmployeeService;

async function cleanup(): Promise<void> {
  await db
    .delete(schema.employees)
    .where(inArray(schema.employees.nameNormalized, TEST_NAMES));
  await db.delete(schema.departments).where(eq(schema.departments.name, TEST_DEPT));
}

beforeAll(async () => {
  const conn = createDb(process.env.DATABASE_URL);
  db = conn.db;
  pool = conn.pool;
  svc = new EmployeeService(db);
  await cleanup();
  const rows = await db
    .insert(schema.departments)
    .values({ name: TEST_DEPT })
    .returning();
  const dept = rows[0];
  if (!dept) throw new Error("failed to create test department");
  deptId = dept.departmentId;
});

afterAll(async () => {
  if (db) await cleanup();
  if (pool) await pool.end();
});

describe("M4 employee resolveOrCreate", () => {
  it("dedups casing/whitespace variants to a single row (FR-15)", async () => {
    const variants = [
      "Juan Dela Cruz",
      "juan dela cruz",
      "Juan  Dela  Cruz",
      "  JUAN DELA CRUZ  ",
    ];

    const ids: string[] = [];
    for (const v of variants) {
      const emp = await db.transaction((tx) => svc.resolveOrCreate(v, deptId, tx));
      ids.push(emp.employeeId);
    }

    expect(new Set(ids).size).toBe(1);
    const rows = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.nameNormalized, "juan dela cruz"));
    expect(rows.length).toBe(1);
  });

  it("concurrent inline creation of the same name → one row, no crash (FR-15)", async () => {
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        db.transaction((tx) => svc.resolveOrCreate("Maria Santos", deptId, tx)),
      ),
    );

    const ids = results.map((r) => r.employeeId);
    // Every concurrent encode resolves to the SAME employee — no near-duplicate.
    expect(new Set(ids).size).toBe(1);
    const rows = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.nameNormalized, "maria santos"));
    expect(rows.length).toBe(1);
  });
});

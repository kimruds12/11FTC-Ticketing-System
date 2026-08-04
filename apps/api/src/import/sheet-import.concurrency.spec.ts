import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Pool } from "pg";
import { createDb, type Db } from "@11ftc/db";
import { TicketStatus } from "@11ftc/shared";
import { SheetImportService } from "./sheet-import.service.js";
import type { SheetRow } from "./xlsx-reader.js";

/**
 * M10 importer — blank employee / department handling.
 *
 * Everything runs with `dryRun: true`, which executes the real code path inside a
 * transaction and rolls it back, so this touches production data not at all while still
 * exercising every FK and unique constraint.
 *
 * `.concurrency.spec.ts` is this repo's marker for "needs a real Postgres"
 * (vitest.concurrency.config.ts); nothing here concerns concurrency.
 */
process.loadEnvFile?.(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../..", ".env"),
);

let db: Db;
let pool: Pool;
let svc: SheetImportService;

// Far-future numbers so they cannot collide with the real IT-2026-#### history.
const SCOPE = "2099";
const SERIAL = "73000"; // any finite Excel date serial — no assertion depends on the date

beforeAll(() => {
  const conn = createDb(process.env.DATABASE_URL);
  db = conn.db;
  pool = conn.pool;
  svc = new SheetImportService(db);
});

afterAll(async () => {
  if (pool) await pool.end();
});

/** Build a `Tickets` tab: row 1 header, then one row per spec. Columns A..D only. */
function sheet(
  rows: Array<{ no: string; employee?: string; department?: string }>,
): SheetRow[] {
  const header: SheetRow = {
    rowNum: 1,
    cells: { 0: "Date", 1: "Ticket No", 2: "Employee", 3: "Department" },
  };
  return [
    header,
    ...rows.map((r, i) => ({
      rowNum: i + 2,
      cells: {
        0: SERIAL,
        1: r.no,
        2: r.employee ?? "",
        3: r.department ?? "",
        4: "__IMPORT_SPEC_ISSUE__",
        5: "spec fixture concern",
        7: TicketStatus.CLOSED,
      } as Record<number, string>,
    })),
  ];
}

const run = (rows: SheetRow[]) =>
  svc.run(rows, { dryRun: true, blankStatus: TicketStatus.CLOSED, assigneeAliases: {} });

describe("M10 import — blank employee/department cells", () => {
  /**
   * THE REGRESSION. The disambiguation pass used to `continue` on a row whose name or
   * department was blank, while the candidate pass substituted a placeholder and imported
   * it anyway. So the second Karen below never registered as "Karen in another department",
   * "karen" was not flagged as colliding, and this ticket was silently attached to the
   * SALES Karen — crediting Sales with a ticket that was never theirs, in FR-18, with
   * nothing anywhere in the report to say so.
   */
  it("does not merge a blank-department row into another department's namesake", async () => {
    const report = await run(
      sheet([
        { no: `IT-${SCOPE}-0801`, employee: "Karen", department: "__IMPORT_SPEC_DEPT__" },
        { no: `IT-${SCOPE}-0802`, employee: "Karen" }, // blank department
      ]),
    );

    expect(report.imported).toBe(2);
    // Both Karens must survive as DISTINCT employees — the whole point.
    expect(report.disambiguatedEmployees).toContain("Karen (__IMPORT_SPEC_DEPT__)");
    expect(report.disambiguatedEmployees).toContain("Karen ((Unspecified))");
  });

  it("reports a blank department instead of silently placeholdering it", async () => {
    const report = await run(sheet([{ no: `IT-${SCOPE}-0803`, employee: "Solo Reporter" }]));

    expect(report.imported).toBe(1);
    expect(report.problems.some((p) => p.includes("0803") && p.includes("blank department"))).toBe(
      true,
    );
  });

  it("reports a blank employee, and still imports the ticket", async () => {
    const report = await run(
      sheet([{ no: `IT-${SCOPE}-0804`, department: "__IMPORT_SPEC_DEPT__" }]),
    );

    // Never drop a real ticket over a missing name — but say so.
    expect(report.imported).toBe(1);
    expect(report.problems.some((p) => p.includes("0804") && p.includes("blank employee"))).toBe(
      true,
    );
  });

  it("reports both when the row is missing employee AND department", async () => {
    const report = await run(sheet([{ no: `IT-${SCOPE}-0805` }]));

    expect(report.imported).toBe(1);
    const problem = report.problems.find((p) => p.includes("0805"));
    expect(problem).toContain("blank employee and department");
  });

  /**
   * The reader trims, so a cell of spaces arrives as "". `?? ` would pass that straight
   * through and create an employee whose name is the empty string; the fallback is
   * truthiness-based for exactly this reason.
   */
  it("treats a whitespace-only cell as blank, not as a name", async () => {
    const report = await run(
      sheet([{ no: `IT-${SCOPE}-0806`, employee: "   ", department: "  " }]),
    );

    expect(report.imported).toBe(1);
    expect(report.problems.find((p) => p.includes("0806"))).toContain("blank employee and department");
  });

  /** A row that genuinely says "Unknown" is data, not a blank — it must not be reported. */
  it("does not report a row whose employee is literally named Unknown", async () => {
    const report = await run(
      sheet([
        { no: `IT-${SCOPE}-0807`, employee: "Unknown", department: "__IMPORT_SPEC_DEPT__" },
      ]),
    );

    expect(report.imported).toBe(1);
    expect(report.problems.filter((p) => p.includes("0807"))).toEqual([]);
  });
});

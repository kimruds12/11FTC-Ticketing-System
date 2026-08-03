import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { schema, type Db, type Tx } from "@11ftc/db";
import { TicketStatus, UserRole, normalizeName } from "@11ftc/shared";
import { DATABASE } from "../database/database.constants.js";
import { serialToDate, serialToInstant, type SheetRow } from "./xlsx-reader.js";

/** Legacy `Tickets` tab layout — confirmed against the real export (M10 spec). */
const COL = {
  date: 0, // A
  ticketNo: 1, // B  ← the natural key; the import is idempotent on this
  employee: 2, // C
  department: 3, // D
  mainIssue: 4, // E
  concern: 5, // F
  assignedTo: 6, // G
  status: 7, // H
  remarks: 8, // I
} as const;

const TICKET_NO = /^IT-(\d{4})-(\d{4})$/;

/**
 * Column G → the technicians who handled the ticket (ADR-0017). "Kim/Paul" is two people;
 * "IT Team" is one entry, because that is the team's own shorthand for "whoever was around"
 * and expanding it would invent attribution the sheet never recorded.
 */
function splitAssignees(raw: string): string[] {
  return raw
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

const lower = (s: string) => s.toLowerCase().trim();

export interface ImportOptions {
  /** Default. Runs the whole import in a transaction and rolls it back. */
  dryRun: boolean;
  /** Email of the user to attribute imported rows to (`created_by` is NOT NULL). */
  actorEmail?: string;
  /** What to use for rows the sheet left blank. */
  blankStatus: TicketStatus;
  /** Sheet assignee text that maps to a real person (e.g. "19" → "Patrick"). */
  assigneeAliases: Record<string, string>;
}

export interface ImportReport {
  committed: boolean;
  totalRows: number;
  imported: number;
  skippedExisting: number;
  departmentsCreated: string[];
  mainIssuesCreated: string[];
  employeesCreated: number;
  disambiguatedEmployees: string[];
  techniciansCreated: string[];
  /** Rows handled by more than one technician — the case a single FK could not express. */
  multiAssigneeRows: number;
  sequenceSeeded: Record<string, number>;
  problems: string[];
}

class RollbackSignal extends Error {}

/** One validated sheet row, ready to become a ticket. */
interface Candidate {
  rowNum: number;
  ticketNo: string;
  scopeKey: string;
  sequenceNumber: number;
  date: string;
  instant: Date;
  employeeName: string;
  departmentName: string;
  mainIssueLabel: string;
  concern: string;
  remarks: string | null;
  status: TicketStatus;
  rawAssignee: string;
}

/**
 * M10 — one-time import of the legacy spreadsheet into Postgres (ADR-0015).
 *
 * Runs from a FILE the operator exports; it never calls the Sheets API, so FR-25's "no path
 * reads ticket data back from the sheet" stays literally true in the shipped request path.
 *
 * Deliberately does NOT reuse `TicketService`: that path allocates a fresh number, stamps
 * timestamps as "now", and enqueues an outbox row. An import must preserve the number the team
 * already knows, use the sheet's own timestamps, and write NO outbox rows — otherwise the
 * worker would append every imported ticket back into the sheet it came from.
 *
 * Everything is batched. The database is a remote Supabase pooler, so a per-row round trip
 * (~1700 of them) takes minutes; this way the whole import is a couple of dozen queries.
 */
@Injectable()
export class SheetImportService {
  private readonly logger = new Logger(SheetImportService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  async run(rows: SheetRow[], opts: ImportOptions): Promise<ImportReport> {
    let report: ImportReport | undefined;

    if (opts.dryRun) {
      // Same code path as a real run, then rolled back — so FKs, uniques and every other
      // constraint are genuinely exercised and the report reflects what WOULD happen.
      try {
        await this.db.transaction(async (tx) => {
          report = await this.importAll(rows, opts, tx, false);
          throw new RollbackSignal();
        });
      } catch (err) {
        if (!(err instanceof RollbackSignal)) throw err;
      }
    } else {
      report = await this.db.transaction((tx) => this.importAll(rows, opts, tx, true));
    }

    if (!report) throw new Error("import produced no report");
    return report;
  }

  private async importAll(
    rows: SheetRow[],
    opts: ImportOptions,
    tx: Tx,
    committed: boolean,
  ): Promise<ImportReport> {
    const report: ImportReport = {
      committed,
      totalRows: rows.length,
      imported: 0,
      skippedExisting: 0,
      departmentsCreated: [],
      mainIssuesCreated: [],
      employeesCreated: 0,
      disambiguatedEmployees: [],
      techniciansCreated: [],
      multiAssigneeRows: 0,
      sequenceSeeded: {},
      problems: [],
    };

    const actorId = await this.resolveActor(opts.actorEmail, tx);

    /* ---- 1. validate rows ------------------------------------------------ */
    const raw: SheetRow[] = [];
    for (const row of rows) {
      if (row.rowNum === 1) continue; // header
      const no = row.cells[COL.ticketNo] ?? "";
      if (!no) continue; // blank spacer row — not a problem worth reporting
      if (!TICKET_NO.test(no)) {
        report.problems.push(
          `row ${row.rowNum}: malformed ticket no ${JSON.stringify(no)} — skipped`,
        );
        continue;
      }
      if (!Number.isFinite(Number(row.cells[COL.date]))) {
        report.problems.push(`row ${row.rowNum} (${no}): unreadable date — skipped`);
        continue;
      }
      raw.push(row);
    }

    /* ---- 2. which employee names need disambiguating? -------------------- */
    // `UNIQUE (name_normalized)` is global (ADR-0007), so one "Karen" can hold one department.
    // Names appearing under several departments are different people and must not merge.
    const deptsByName = new Map<string, Set<string>>();
    for (const row of raw) {
      const name = row.cells[COL.employee];
      const dept = row.cells[COL.department];
      if (!name || !dept) continue;
      const key = normalizeName(name);
      if (!deptsByName.has(key)) deptsByName.set(key, new Set());
      deptsByName.get(key)!.add(dept);
    }
    const colliding = new Set(
      [...deptsByName.entries()].filter(([, d]) => d.size > 1).map(([n]) => n),
    );

    /* ---- 3. build candidates -------------------------------------------- */
    const candidates: Candidate[] = [];
    for (const row of raw) {
      const ticketNo = row.cells[COL.ticketNo]!;
      const m = TICKET_NO.exec(ticketNo)!;
      const serial = Number(row.cells[COL.date]);
      const departmentName = row.cells[COL.department] ?? "(Unspecified)";
      const rawName = row.cells[COL.employee] ?? "Unknown";
      const employeeName = colliding.has(normalizeName(rawName))
        ? `${rawName} (${departmentName})`
        : rawName;
      if (employeeName !== rawName && !report.disambiguatedEmployees.includes(employeeName)) {
        report.disambiguatedEmployees.push(employeeName);
      }

      const rawStatus = row.cells[COL.status] ?? "";
      let status: TicketStatus;
      if (rawStatus === TicketStatus.CLOSED || rawStatus === TicketStatus.ONGOING) {
        status = rawStatus;
      } else if (rawStatus === TicketStatus.OPEN) {
        status = TicketStatus.OPEN;
      } else {
        status = opts.blankStatus;
        if (rawStatus !== "") {
          report.problems.push(
            `row ${row.rowNum} (${ticketNo}): unrecognised status ${JSON.stringify(rawStatus)} → ${status}`,
          );
        }
      }

      candidates.push({
        rowNum: row.rowNum,
        ticketNo,
        scopeKey: m[1]!, // 'year' scope — confirmed by the real numbers (OPEN-1)
        sequenceNumber: Number(m[2]),
        date: serialToDate(serial),
        instant: serialToInstant(serial),
        employeeName,
        departmentName,
        mainIssueLabel: row.cells[COL.mainIssue] ?? "Other",
        concern: row.cells[COL.concern] ?? "(not recorded)",
        remarks: row.cells[COL.remarks] ?? null,
        status,
        rawAssignee: row.cells[COL.assignedTo] ?? "",
      });
    }

    /* ---- 4. skip tickets already imported (idempotent on ticket_no) ------ */
    const existing = new Set(
      (await tx.select({ no: schema.tickets.ticketNo }).from(schema.tickets)).map((r) => r.no),
    );
    const todo = candidates.filter((c) => {
      if (existing.has(c.ticketNo)) {
        report.skippedExisting++;
        return false;
      }
      return true;
    });
    if (todo.length === 0) return report;

    /* ---- 5. lookups: load, create what's missing, all in batches --------- */
    const deptIds = await this.upsertLookup(
      tx,
      [...new Set(todo.map((c) => c.departmentName))],
      await tx
        .select({ id: schema.departments.departmentId, name: schema.departments.name })
        .from(schema.departments),
      (names) =>
        tx
          .insert(schema.departments)
          .values(names.map((name) => ({ name })))
          .returning({ id: schema.departments.departmentId, name: schema.departments.name }),
      report.departmentsCreated,
    );

    const issueIds = await this.upsertLookup(
      tx,
      [...new Set(todo.map((c) => c.mainIssueLabel))],
      (
        await tx
          .select({ id: schema.mainIssueCategory.mainIssueId, name: schema.mainIssueCategory.label })
          .from(schema.mainIssueCategory)
      ).map((r) => ({ id: r.id, name: r.name })),
      (labels) =>
        tx
          .insert(schema.mainIssueCategory)
          .values(labels.map((label) => ({ label })))
          .returning({
            id: schema.mainIssueCategory.mainIssueId,
            name: schema.mainIssueCategory.label,
          }),
      report.mainIssuesCreated,
    );

    // Employees: dedupe on name_normalized, first department seen wins (M4 semantics).
    const employeeIds = new Map<string, string>();
    for (const row of await tx
      .select({ id: schema.employees.employeeId, key: schema.employees.nameNormalized })
      .from(schema.employees)) {
      employeeIds.set(row.key, row.id);
    }
    const missingEmployees = new Map<string, { name: string; departmentId: string }>();
    for (const c of todo) {
      const key = normalizeName(c.employeeName);
      if (employeeIds.has(key) || missingEmployees.has(key)) continue;
      const departmentId = deptIds.get(lower(c.departmentName));
      if (!departmentId) continue;
      missingEmployees.set(key, { name: c.employeeName, departmentId });
    }
    if (missingEmployees.size > 0) {
      const made = await tx
        .insert(schema.employees)
        .values(
          [...missingEmployees.entries()].map(([key, v]) => ({
            name: v.name,
            nameNormalized: key,
            departmentId: v.departmentId,
          })),
        )
        .returning({ id: schema.employees.employeeId, key: schema.employees.nameNormalized });
      for (const r of made) employeeIds.set(r.key, r.id);
      report.employeesCreated = made.length;
    }

    /* ---- 5b. technicians (ADR-0017) ------------------------------------- */
    // An account is OPTIONAL for a technician — most of the sheet's handlers have never
    // signed in. Where a name DOES match a user's first name we link it, so "my tickets"
    // resolves; attribution itself never depends on that link.
    const userIds = new Map<string, string>();
    for (const u of await tx
      .select({ id: schema.users.userId, fullName: schema.users.fullName })
      .from(schema.users)) {
      const full = lower(u.fullName);
      userIds.set(full, u.id);
      const first = full.split(/\s+/)[0];
      if (first && !userIds.has(first)) userIds.set(first, u.id);
    }

    /** ticketNo → ordered technician names, exactly as column G reads. */
    const assigneesByTicket = new Map<string, string[]>();
    const wantedTechs = new Map<string, string>(); // normalized → display name
    for (const c of todo) {
      const aliased = opts.assigneeAliases[c.rawAssignee] ?? c.rawAssignee;
      const names = splitAssignees(aliased);
      if (names.length === 0) continue;
      if (names.length > 1) report.multiAssigneeRows++;
      assigneesByTicket.set(c.ticketNo, names);
      for (const n of names) wantedTechs.set(normalizeName(n), n);
    }

    const technicianIds = new Map<string, string>();
    if (wantedTechs.size > 0) {
      for (const t of await tx
        .select({
          id: schema.technicians.technicianId,
          key: schema.technicians.nameNormalized,
        })
        .from(schema.technicians)
        .where(inArray(schema.technicians.nameNormalized, [...wantedTechs.keys()]))) {
        technicianIds.set(t.key, t.id);
      }
      const missing = [...wantedTechs.entries()].filter(([key]) => !technicianIds.has(key));
      if (missing.length > 0) {
        const made = await tx
          .insert(schema.technicians)
          .values(
            missing.map(([key, name]) => ({
              name,
              nameNormalized: key,
              userId: userIds.get(key) ?? null,
            })),
          )
          .returning({
            id: schema.technicians.technicianId,
            key: schema.technicians.nameNormalized,
            name: schema.technicians.name,
          });
        for (const r of made) {
          technicianIds.set(r.key, r.id);
          report.techniciansCreated.push(r.name);
        }
      }
    }

    /* ---- 6. the sequence rows must exist before the tickets (FK) --------- */
    const scopes = [...new Set(todo.map((c) => c.scopeKey))];
    await tx
      .insert(schema.ticketSequence)
      .values(scopes.map((scopeKey) => ({ scopeKey, lastSequence: 0 })))
      .onConflictDoNothing({ target: schema.ticketSequence.scopeKey });

    /* ---- 7. insert the tickets ------------------------------------------ */
    const values = todo.map((c) => ({
      ticketNo: c.ticketNo,
      date: c.date,
      sequenceScope: c.scopeKey,
      sequenceNumber: c.sequenceNumber,
      employeeId: employeeIds.get(normalizeName(c.employeeName))!,
      mainIssueId: issueIds.get(lower(c.mainIssueLabel))!,
      concern: c.concern,
      createdBy: actorId,
      status: c.status,
      remarks: c.remarks,
      // Timestamps come from the sheet, never from now(). Set once (invariant 5).
      ongoingAt: c.status === TicketStatus.ONGOING ? c.instant : null,
      closedAt: c.status === TicketStatus.CLOSED ? c.instant : null,
      source: "IMPORT" as const,
      createdAt: c.instant,
      updatedAt: c.instant,
    }));

    const inserted = await tx
      .insert(schema.tickets)
      .values(values)
      .returning({ id: schema.tickets.ticketId, no: schema.tickets.ticketNo });
    report.imported = inserted.length;

    /* ---- 7b. link the technicians who handled each ticket ---------------- */
    const assigneeRows = inserted.flatMap((t) =>
      (assigneesByTicket.get(t.no) ?? []).map((name, position) => ({
        ticketId: t.id,
        technicianId: technicianIds.get(normalizeName(name))!,
        position,
      })),
    );
    if (assigneeRows.length > 0) {
      await tx.insert(schema.ticketAssignees).values(assigneeRows).onConflictDoNothing();
    }

    /* ---- 8. one CREATE audit row each ----------------------------------- */
    // The sheet records no field-level history; inventing one would make the audit log lie.
    const byNo = new Map(inserted.map((r) => [r.no, r.id]));
    await tx.insert(schema.auditLog).values(
      todo.map((c) => ({
        ticketId: byNo.get(c.ticketNo)!,
        action: "CREATE" as const,
        fieldName: "status",
        previousValue: null,
        newValue: c.status,
        updatedBy: actorId,
        updatedAt: c.instant,
      })),
    );

    // NOTE: no sync_outbox rows on purpose (M10 invariant 2).

    /* ---- 9. seed ticket_sequence past the highest imported number ------- */
    // Without this the first NEW encode collides with UNIQUE (sequence_scope, sequence_number).
    const maxByScope = new Map<string, number>();
    for (const c of todo) {
      maxByScope.set(c.scopeKey, Math.max(maxByScope.get(c.scopeKey) ?? 0, c.sequenceNumber));
    }
    for (const [scopeKey, maxSeq] of maxByScope) {
      await tx
        .insert(schema.ticketSequence)
        .values({ scopeKey, lastSequence: maxSeq })
        .onConflictDoUpdate({
          target: schema.ticketSequence.scopeKey,
          set: {
            lastSequence: sql`greatest(${schema.ticketSequence.lastSequence}, ${maxSeq})`,
            updatedAt: new Date(),
          },
        });
      report.sequenceSeeded[scopeKey] = maxSeq;
    }

    return report;
  }

  /** Load existing lookup rows, batch-create the missing ones, return name→id (lowercased). */
  private async upsertLookup(
    _tx: Tx,
    wanted: string[],
    existing: { id: string; name: string }[],
    createMissing: (names: string[]) => Promise<{ id: string; name: string }[]>,
    createdOut: string[],
  ): Promise<Map<string, string>> {
    const byName = new Map<string, string>();
    for (const row of existing) byName.set(lower(row.name), row.id);

    const missing = wanted.filter((n) => !byName.has(lower(n)));
    if (missing.length > 0) {
      for (const row of await createMissing(missing)) {
        byName.set(lower(row.name), row.id);
        createdOut.push(row.name);
      }
    }
    return byName;
  }

  private async resolveActor(email: string | undefined, tx: Tx): Promise<string> {
    if (email) {
      const found = await tx
        .select({ id: schema.users.userId })
        .from(schema.users)
        .where(eq(schema.users.email, email.toLowerCase()))
        .limit(1);
      if (!found[0]) throw new Error(`--actor ${email} not found in users`);
      return found[0].id;
    }
    const admin = await tx
      .select({ id: schema.users.userId, email: schema.users.email })
      .from(schema.users)
      .where(
        and(eq(schema.users.role, UserRole.IT_ADMINISTRATOR), eq(schema.users.isActive, true)),
      )
      .limit(1);
    if (!admin[0]) {
      throw new Error(
        "no active IT_ADMINISTRATOR to attribute the import to. Sign in once, or pass --actor <email>.",
      );
    }
    this.logger.log(`attributing imported tickets to ${admin[0].email}`);
    return admin[0].id;
  }
}

import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { schema, type Db } from "@11ftc/db";
import {
  TicketStatus,
  type AnalyticsWindow,
  type CountPoint,
  type CoverageDto,
  type DatePoint,
  type FirstTimeFixDto,
  type Granularity,
  type OngoingAgeingItem,
  type ReportMatrixDto,
  type ReportQuery,
  type StatusCounts,
} from "@11ftc/shared";
import { DATABASE } from "../database/database.constants.js";

// count(*) as a JS number — cast ::int so node-postgres doesn't hand back a bigint string.
const countInt = sql<number>`count(*)::int`;

const GRANULARITIES = new Set<Granularity>(["day", "week", "month"]);

/**
 * Bucket start for a time series. `date_trunc` aligns to real calendar boundaries — a week
 * always starts Monday, a month on the 1st — so two people looking at "this month" see the
 * same buckets regardless of when they loaded the page.
 *
 * The granularity is INLINED with `sql.raw`, not bound as a parameter, and that is load-bearing:
 * Postgres matches GROUP BY expressions syntactically, while drizzle re-emits this expression
 * with a FRESH placeholder in GROUP BY and ORDER BY. Bound, it becomes `date_trunc($1, …)` in
 * SELECT and `date_trunc($2, …)` in GROUP BY — two different expressions as far as the planner
 * is concerned — and the whole query dies with "column tickets.date must appear in the GROUP BY
 * clause". Inlining makes all three occurrences identical.
 *
 * Safe because `g` comes from a Zod enum, never from raw input. The assertion below is the
 * belt-and-braces guarantee that stays true if someone later widens the type.
 */
function bucket(expr: SQL, g: Granularity | undefined): SQL<string> {
  // `undefined` means the caller omitted it; fall back to the same default
  // `granularitySchema` applies, so an internal caller behaves like an HTTP one.
  const key = g ?? "day";
  if (!GRANULARITIES.has(key)) throw new Error(`invalid granularity: ${String(g)}`);
  return sql<string>`to_char(date_trunc('${sql.raw(key)}', ${expr}), 'YYYY-MM-DD')`;
}

/**
 * M9 — Analytics. Read-only aggregates over Postgres (no writes, no cache/materialized views
 * until a query is measured slow — ADR-0008). Two subtle invariants: FR-21 buckets by
 * `closed_at` (not `date`/`updated_at`), and `ongoing_at IS NULL` on a Closed ticket is the
 * first-time-fix signal (FR-23) — no extra column.
 */
@Injectable()
export class AnalyticsService {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** FR-17 — ticket volume bucketed by encode date, daily/weekly/monthly. */
  async volume(w: AnalyticsWindow): Promise<DatePoint[]> {
    const b = bucket(sql`${schema.tickets.date}::timestamp`, w.granularity);
    const rows = await this.db
      .select({ date: b, count: countInt })
      .from(schema.tickets)
      .where(dateWindow(w))
      .groupBy(b)
      .orderBy(b);
    return rows.map((r) => ({ date: r.date, count: r.count }));
  }

  /** FR-21 — problems solved, bucketed by CLOSED_AT (never `date`/`updated_at`). */
  async solved(w: AnalyticsWindow): Promise<DatePoint[]> {
    const b = bucket(
      sql`(${schema.tickets.closedAt} at time zone 'UTC')`,
      w.granularity,
    );
    const rows = await this.db
      .select({ date: b, count: countInt })
      .from(schema.tickets)
      .where(and(eq(schema.tickets.status, TicketStatus.CLOSED), closedAtWindow(w)))
      .groupBy(b)
      .orderBy(b);
    return rows.map((r) => ({ date: r.date, count: r.count }));
  }

  /** FR-22 — Open / Ongoing / Closed distribution. */
  async status(): Promise<StatusCounts> {
    const rows = await this.db
      .select({ status: schema.tickets.status, count: countInt })
      .from(schema.tickets)
      .groupBy(schema.tickets.status);
    const by = new Map(rows.map((r) => [r.status, r.count] as const));
    const open = by.get(TicketStatus.OPEN) ?? 0;
    const ongoing = by.get(TicketStatus.ONGOING) ?? 0;
    const closed = by.get(TicketStatus.CLOSED) ?? 0;
    return { open, ongoing, closed, total: open + ongoing + closed };
  }

  /** FR-18 — by department. */
  async byDepartment(w: AnalyticsWindow): Promise<CountPoint[]> {
    const rows = await this.db
      .select({ key: schema.departments.name, count: countInt })
      .from(schema.tickets)
      .innerJoin(
        schema.employees,
        eq(schema.tickets.employeeId, schema.employees.employeeId),
      )
      .innerJoin(
        schema.departments,
        eq(schema.employees.departmentId, schema.departments.departmentId),
      )
      .where(dateWindow(w))
      .groupBy(schema.departments.name)
      .orderBy(sql`count(*) desc`);
    return rows.map((r) => ({ key: r.key, count: r.count }));
  }

  /**
   * FR-19 — by technician, through `ticket_assignees` (ADR-0017).
   *
   * This used to join `users` on the old `assigned_to` FK, which meant it only ever saw the
   * tickets whose handler happened to hold an account — 73 of 280 on the real data. Joining
   * the assignee table instead covers every ticket, and a two-technician ticket credits BOTH
   * (so the column total legitimately exceeds the ticket count).
   */
  async byTechnician(w: AnalyticsWindow): Promise<CountPoint[]> {
    const rows = await this.db
      .select({ key: schema.technicians.name, count: countInt })
      .from(schema.tickets)
      .innerJoin(
        schema.ticketAssignees,
        eq(schema.tickets.ticketId, schema.ticketAssignees.ticketId),
      )
      .innerJoin(
        schema.technicians,
        eq(schema.ticketAssignees.technicianId, schema.technicians.technicianId),
      )
      .where(dateWindow(w))
      .groupBy(schema.technicians.name)
      .orderBy(sql`count(*) desc`);
    return rows.map((r) => ({ key: r.key, count: r.count }));
  }

  /** FR-20 — by main-issue category. */
  async byCategory(w: AnalyticsWindow): Promise<CountPoint[]> {
    const rows = await this.db
      .select({ key: schema.mainIssueCategory.label, count: countInt })
      .from(schema.tickets)
      .innerJoin(
        schema.mainIssueCategory,
        eq(schema.tickets.mainIssueId, schema.mainIssueCategory.mainIssueId),
      )
      .where(dateWindow(w))
      .groupBy(schema.mainIssueCategory.label)
      .orderBy(sql`count(*) desc`);
    return rows.map((r) => ({ key: r.key, count: r.count }));
  }

  /**
   * FR-23 — first-time fix: Closed AND `ongoing_at IS NULL`, over Closed. Windowed on closed_at.
   *
   * EXCLUDES `source='IMPORT'` (ADR-0015). The legacy spreadsheet never recorded `ongoing_at`,
   * so every imported Closed row looks like a first-time fix and the rate would read ~100% on
   * data that carries no signal. Imported rows stay in every other metric, where they are real.
   */
  async firstTimeFix(w: AnalyticsWindow): Promise<FirstTimeFixDto> {
    const appOnly = eq(schema.tickets.source, "APP");
    const rows = await this.db
      .select({
        closed: sql<number>`(count(*) filter (where ${schema.tickets.status} = 'Closed'))::int`,
        ftf: sql<number>`(count(*) filter (where ${schema.tickets.status} = 'Closed' and ${schema.tickets.ongoingAt} is null))::int`,
      })
      .from(schema.tickets)
      .where(and(appOnly, closedAtWindow(w)));
    const r = rows[0] ?? { closed: 0, ftf: 0 };
    return {
      closed: r.closed,
      firstTimeFix: r.ftf,
      rate: r.closed > 0 ? r.ftf / r.closed : 0,
    };
  }

  /**
   * FR-37 — the full extent of encoded ticket dates. Deliberately unfiltered: the period
   * picker is built from this, and a picker narrowed by the filter it is meant to set would
   * strand the user on an empty month with no way back.
   */
  async coverage(): Promise<CoverageDto> {
    const rows = await this.db
      .select({
        from: sql<string | null>`min(${schema.tickets.date})::text`,
        to: sql<string | null>`max(${schema.tickets.date})::text`,
        total: countInt,
      })
      .from(schema.tickets);
    const r = rows[0] ?? { from: null, to: null, total: 0 };
    return { from: r.from, to: r.to, total: r.total };
  }

  /**
   * FR-36 — tickets per department per period (the report cross-tab).
   *
   * Two queries, pivoted here rather than in SQL. A `crosstab`/dynamic-pivot query would have
   * to build a column list from the data at runtime, which is both harder to read and the
   * kind of string-built SQL this codebase avoids; the row counts are tens per day, so the
   * pivot costs nothing.
   *
   * Every ACTIVE department gets a row even when its count is zero. A report is a fixed-shape
   * document: if a department vanished from June's report and reappeared in July's, that reads
   * as a data error rather than as "nobody there filed a ticket".
   */
  async report(q: ReportQuery): Promise<ReportMatrixDto> {
    const b = bucket(sql`${schema.tickets.date}::timestamp`, q.granularity);

    const filters: SQL[] = [];
    const window = dateWindow(q);
    if (window) filters.push(window);
    if (q.departmentId) {
      filters.push(sql`${schema.employees.departmentId} = ${q.departmentId}`);
    }
    if (q.mainIssueId) {
      filters.push(sql`${schema.tickets.mainIssueId} = ${q.mainIssueId}`);
    }

    const [cells, departments] = await Promise.all([
      this.db
        .select({
          key: schema.departments.name,
          departmentId: schema.departments.departmentId,
          bucket: b,
          count: countInt,
        })
        .from(schema.tickets)
        .innerJoin(
          schema.employees,
          eq(schema.tickets.employeeId, schema.employees.employeeId),
        )
        .innerJoin(
          schema.departments,
          eq(schema.employees.departmentId, schema.departments.departmentId),
        )
        .where(filters.length ? and(...filters) : undefined)
        .groupBy(schema.departments.departmentId, schema.departments.name, b),
      this.db
        .select({
          key: schema.departments.name,
          departmentId: schema.departments.departmentId,
        })
        .from(schema.departments)
        .where(
          q.departmentId
            ? and(
                eq(schema.departments.isActive, true),
                eq(schema.departments.departmentId, q.departmentId),
              )
            : eq(schema.departments.isActive, true),
        )
        .orderBy(schema.departments.name),
    ]);

    // Columns come from the DATA, not from iterating the window: a month with no tickets
    // gets no column, so the table never pads out to empty periods at either end.
    const buckets = [...new Set(cells.map((c) => c.bucket))].sort();
    const columnOf = new Map(buckets.map((bk, i) => [bk, i] as const));

    // Include an inactive department that nonetheless has tickets in the window — retiring a
    // lookup must not retroactively delete its history from the report (FR-9 in spirit).
    const rowKeys = new Map(departments.map((d) => [d.departmentId, d.key] as const));
    for (const c of cells) if (!rowKeys.has(c.departmentId)) rowKeys.set(c.departmentId, c.key);

    const rows = [...rowKeys.entries()]
      .map(([departmentId, key]) => ({
        departmentId,
        key,
        counts: new Array<number>(buckets.length).fill(0),
        total: 0,
      }))
      .sort((a, z) => a.key.localeCompare(z.key));
    const rowOf = new Map(rows.map((r) => [r.departmentId, r] as const));

    const columnTotals = new Array<number>(buckets.length).fill(0);
    let grandTotal = 0;
    for (const c of cells) {
      const row = rowOf.get(c.departmentId);
      const col = columnOf.get(c.bucket);
      if (row === undefined || col === undefined) continue;
      // `?? 0` only to satisfy noUncheckedIndexedAccess — both arrays were filled to
      // `buckets.length` above and `col` came from `columnOf`, so the slot always exists.
      row.counts[col] = (row.counts[col] ?? 0) + c.count;
      row.total += c.count;
      columnTotals[col] = (columnTotals[col] ?? 0) + c.count;
      grandTotal += c.count;
    }

    return {
      buckets,
      rows: rows.map(({ key, counts, total }) => ({ key, counts, total })),
      columnTotals,
      grandTotal,
    };
  }

  /** FR-24 — Ongoing tickets and how long they've been Ongoing (oldest first). */
  async ongoingAgeing(): Promise<OngoingAgeingItem[]> {
    const rows = await this.db
      .select({
        ticketId: schema.tickets.ticketId,
        ticketNo: schema.tickets.ticketNo,
        ongoingAt: schema.tickets.ongoingAt,
        ageDays: sql<number>`(extract(day from now() - ${schema.tickets.ongoingAt}))::int`,
      })
      .from(schema.tickets)
      .where(eq(schema.tickets.status, TicketStatus.ONGOING))
      .orderBy(schema.tickets.ongoingAt);
    return rows.map((r) => ({
      ticketId: r.ticketId,
      ticketNo: r.ticketNo,
      ongoingAt: r.ongoingAt ? new Date(r.ongoingAt).toISOString() : "",
      ageDays: r.ageDays ?? 0,
    }));
  }
}

function dateWindow(w: AnalyticsWindow): SQL | undefined {
  const parts: SQL[] = [];
  if (w.from) parts.push(sql`${schema.tickets.date} >= ${w.from}`);
  if (w.to) parts.push(sql`${schema.tickets.date} <= ${w.to}`);
  return parts.length ? and(...parts) : undefined;
}

function closedAtWindow(w: AnalyticsWindow): SQL | undefined {
  const parts: SQL[] = [];
  if (w.from) {
    parts.push(sql`(${schema.tickets.closedAt} at time zone 'UTC')::date >= ${w.from}`);
  }
  if (w.to) {
    parts.push(sql`(${schema.tickets.closedAt} at time zone 'UTC')::date <= ${w.to}`);
  }
  return parts.length ? and(...parts) : undefined;
}

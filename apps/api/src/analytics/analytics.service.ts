import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { schema, type Db } from "@11ftc/db";
import {
  TicketStatus,
  type AnalyticsWindow,
  type CountPoint,
  type DatePoint,
  type FirstTimeFixDto,
  type OngoingAgeingItem,
  type StatusCounts,
} from "@11ftc/shared";
import { DATABASE } from "../database/database.constants.js";

// count(*) as a JS number — cast ::int so node-postgres doesn't hand back a bigint string.
const countInt = sql<number>`count(*)::int`;

/**
 * M9 — Analytics. Read-only aggregates over Postgres (no writes, no cache/materialized views
 * until a query is measured slow — ADR-0008). Two subtle invariants: FR-21 buckets by
 * `closed_at` (not `date`/`updated_at`), and `ongoing_at IS NULL` on a Closed ticket is the
 * first-time-fix signal (FR-23) — no extra column.
 */
@Injectable()
export class AnalyticsService {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** FR-17 — ticket volume bucketed by encode date. */
  async volume(w: AnalyticsWindow): Promise<DatePoint[]> {
    const rows = await this.db
      .select({ date: schema.tickets.date, count: countInt })
      .from(schema.tickets)
      .where(dateWindow(w))
      .groupBy(schema.tickets.date)
      .orderBy(schema.tickets.date);
    return rows.map((r) => ({ date: r.date, count: r.count }));
  }

  /** FR-21 — problems solved, bucketed by CLOSED_AT (never `date`/`updated_at`). */
  async solved(w: AnalyticsWindow): Promise<DatePoint[]> {
    const day = sql<string>`to_char(${schema.tickets.closedAt} at time zone 'UTC', 'YYYY-MM-DD')`;
    const rows = await this.db
      .select({ date: day, count: countInt })
      .from(schema.tickets)
      .where(and(eq(schema.tickets.status, TicketStatus.CLOSED), closedAtWindow(w)))
      .groupBy(day)
      .orderBy(day);
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

  /** FR-19 — by assigned technician (assigned tickets only). */
  async byTechnician(w: AnalyticsWindow): Promise<CountPoint[]> {
    const rows = await this.db
      .select({ key: schema.users.fullName, count: countInt })
      .from(schema.tickets)
      .innerJoin(schema.users, eq(schema.tickets.assignedTo, schema.users.userId))
      .where(dateWindow(w))
      .groupBy(schema.users.fullName)
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

  /** FR-23 — first-time fix: Closed AND `ongoing_at IS NULL`, over Closed. Windowed on closed_at. */
  async firstTimeFix(w: AnalyticsWindow): Promise<FirstTimeFixDto> {
    const rows = await this.db
      .select({
        closed: sql<number>`(count(*) filter (where ${schema.tickets.status} = 'Closed'))::int`,
        ftf: sql<number>`(count(*) filter (where ${schema.tickets.status} = 'Closed' and ${schema.tickets.ongoingAt} is null))::int`,
      })
      .from(schema.tickets)
      .where(closedAtWindow(w));
    const r = rows[0] ?? { closed: 0, ftf: 0 };
    return {
      closed: r.closed,
      firstTimeFix: r.ftf,
      rate: r.closed > 0 ? r.ftf / r.closed : 0,
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

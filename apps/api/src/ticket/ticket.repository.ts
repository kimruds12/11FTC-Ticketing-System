import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { alias, type PgUpdateSetSource } from "drizzle-orm/pg-core";
import { schema, type Db, type Tx } from "@11ftc/db";
import type { TicketDto, TicketListQuery, TicketListResult } from "@11ftc/shared";
import { DATABASE } from "../database/database.constants.js";

export type TicketRow = typeof schema.tickets.$inferSelect;
export type NewTicket = typeof schema.tickets.$inferInsert;
export type TicketPatch = PgUpdateSetSource<typeof schema.tickets>;

const assignedUser = alias(schema.users, "assigned_user");

/**
 * All Drizzle access for tickets. Writes take the caller's `tx` (M5 is the single
 * transaction boundary — this never opens its own). Reads are enriched with the display
 * names/labels for the UI; IDs stay canonical.
 */
@Injectable()
export class TicketRepository {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  async insert(values: NewTicket, tx: Tx): Promise<TicketRow> {
    const rows = await tx.insert(schema.tickets).values(values).returning();
    const row = rows[0];
    if (!row) throw new Error("ticket insert returned no row");
    return row;
  }

  /** Lock the row FIRST, before the legality check (.claude/rules/domain.md watch-out). */
  async findByIdForUpdate(ticketId: string, tx: Tx): Promise<TicketRow | undefined> {
    const rows = await tx
      .select()
      .from(schema.tickets)
      .where(eq(schema.tickets.ticketId, ticketId))
      .for("update")
      .limit(1);
    return rows[0];
  }

  async update(ticketId: string, patch: TicketPatch, tx: Tx): Promise<TicketRow> {
    const rows = await tx
      .update(schema.tickets)
      .set(patch)
      .where(eq(schema.tickets.ticketId, ticketId))
      .returning();
    const row = rows[0];
    if (!row) throw new Error("ticket update returned no row");
    return row;
  }

  private enriched() {
    return this.db
      .select({
        ticketId: schema.tickets.ticketId,
        ticketNo: schema.tickets.ticketNo,
        date: schema.tickets.date,
        status: schema.tickets.status,
        concern: schema.tickets.concern,
        remarks: schema.tickets.remarks,
        employeeId: schema.tickets.employeeId,
        employeeName: schema.employees.name,
        department: schema.departments.name,
        mainIssueId: schema.tickets.mainIssueId,
        mainIssue: schema.mainIssueCategory.label,
        assignedTo: schema.tickets.assignedTo,
        assignedToName: assignedUser.fullName,
        createdBy: schema.tickets.createdBy,
        ongoingAt: schema.tickets.ongoingAt,
        closedAt: schema.tickets.closedAt,
        createdAt: schema.tickets.createdAt,
        updatedAt: schema.tickets.updatedAt,
      })
      .from(schema.tickets)
      .leftJoin(
        schema.employees,
        eq(schema.tickets.employeeId, schema.employees.employeeId),
      )
      .leftJoin(
        schema.departments,
        eq(schema.employees.departmentId, schema.departments.departmentId),
      )
      .leftJoin(
        schema.mainIssueCategory,
        eq(schema.tickets.mainIssueId, schema.mainIssueCategory.mainIssueId),
      )
      .leftJoin(assignedUser, eq(schema.tickets.assignedTo, assignedUser.userId))
      .$dynamic();
  }

  async findDto(ticketId: string): Promise<TicketDto | undefined> {
    const rows = await this.enriched()
      .where(eq(schema.tickets.ticketId, ticketId))
      .limit(1);
    const r = rows[0];
    return r ? toDto(r) : undefined;
  }

  async list(query: TicketListQuery): Promise<TicketListResult> {
    const conditions = [];
    if (query.status) conditions.push(eq(schema.tickets.status, query.status));
    if (query.dateFrom) conditions.push(gte(schema.tickets.date, query.dateFrom));
    if (query.dateTo) conditions.push(lte(schema.tickets.date, query.dateTo));
    if (query.mainIssueId) conditions.push(eq(schema.tickets.mainIssueId, query.mainIssueId));
    if (query.employeeId) conditions.push(eq(schema.tickets.employeeId, query.employeeId));
    if (query.assignedTo) conditions.push(eq(schema.tickets.assignedTo, query.assignedTo));
    if (query.departmentId) {
      conditions.push(eq(schema.employees.departmentId, query.departmentId));
    }
    if (query.q) {
      conditions.push(
        or(
          ilike(schema.tickets.concern, `%${query.q}%`),
          ilike(schema.tickets.ticketNo, `%${query.q}%`),
        ),
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await this.enriched()
      .where(where)
      .orderBy(desc(schema.tickets.createdAt))
      .limit(query.limit)
      .offset(query.offset);

    const totalRows = await this.db
      .select({ value: count() })
      .from(schema.tickets)
      .leftJoin(
        schema.employees,
        eq(schema.tickets.employeeId, schema.employees.employeeId),
      )
      .where(where);

    return { items: rows.map(toDto), total: totalRows[0]?.value ?? 0 };
  }
}

type EnrichedRow = {
  ticketId: string;
  ticketNo: string;
  date: string;
  status: TicketDto["status"];
  concern: string;
  remarks: string | null;
  employeeId: string;
  employeeName: string | null;
  department: string | null;
  mainIssueId: string;
  mainIssue: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  createdBy: string;
  ongoingAt: Date | string | null;
  closedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function iso(v: Date | string | null): string | null {
  return v === null ? null : new Date(v).toISOString();
}

function toDto(r: EnrichedRow): TicketDto {
  return {
    ticketId: r.ticketId,
    ticketNo: r.ticketNo,
    date: r.date,
    status: r.status,
    concern: r.concern,
    remarks: r.remarks,
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    department: r.department,
    mainIssueId: r.mainIssueId,
    mainIssue: r.mainIssue,
    assignedTo: r.assignedTo,
    assignedToName: r.assignedToName,
    createdBy: r.createdBy,
    ongoingAt: iso(r.ongoingAt),
    closedAt: iso(r.closedAt),
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}

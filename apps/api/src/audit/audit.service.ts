import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { schema, type Db, type Tx } from "@11ftc/db";
import type {
  AuditAction,
  AuditEntryDto,
  AuditLogListResult,
  AuditLogQuery,
  AuthContext,
} from "@11ftc/shared";
import { DATABASE } from "../database/database.constants.js";

/** A single changed field — the caller (M5) diffs the row before/after and passes these. */
export interface FieldChange {
  fieldName: string;
  previousValue: string | null;
  newValue: string | null;
}

/**
 * M6 — Audit Log. One row PER changed field, written at the APPLICATION layer (not DB
 * triggers — triggers can't see `updated_by`, which lives in the HTTP session), in the SAME
 * transaction as the change it describes (FR-34). Immutable (FR-35): no update/delete path.
 */
@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Append one audit row per changed field, inside the caller's `tx`. Never opens its own. */
  async log(
    action: AuditAction,
    ticketId: string,
    changes: FieldChange[],
    actor: AuthContext,
    tx: Tx,
  ): Promise<void> {
    if (changes.length === 0) return;
    await tx.insert(schema.auditLog).values(
      changes.map((c) => ({
        ticketId,
        action,
        fieldName: c.fieldName,
        previousValue: c.previousValue,
        newValue: c.newValue,
        updatedBy: actor.userId,
      })),
    );
  }

  /**
   * FR-40 — the cross-ticket feed, newest first, filtered and paginated in the DATABASE.
   *
   * Deliberately not "fetch everything and filter in the browser": this table only grows —
   * nothing is ever deleted (FR-35) — so it is the one dataset guaranteed to outlive any
   * client-side approach. It is already 301 rows on six weeks of imported history, and every
   * future edit adds one row per changed field.
   */
  async list(query: AuditLogQuery): Promise<AuditLogListResult> {
    const conditions: SQL[] = [];
    if (query.action) conditions.push(eq(schema.auditLog.action, query.action));
    if (query.updatedBy) conditions.push(eq(schema.auditLog.updatedBy, query.updatedBy));
    if (query.ticketId) conditions.push(eq(schema.auditLog.ticketId, query.ticketId));
    // Bounds are inclusive DAYS applied to when the CHANGE happened, so `dateTo` has to reach
    // the end of that day rather than its midnight.
    if (query.dateFrom) {
      conditions.push(sql`${schema.auditLog.updatedAt} >= ${query.dateFrom}::date`);
    }
    if (query.dateTo) {
      conditions.push(
        sql`${schema.auditLog.updatedAt} < (${query.dateTo}::date + interval '1 day')`,
      );
    }
    if (query.q) {
      const like = `%${query.q}%`;
      const matches = or(
        ilike(schema.tickets.ticketNo, like),
        ilike(schema.auditLog.fieldName, like),
        ilike(schema.auditLog.newValue, like),
        ilike(schema.auditLog.previousValue, like),
        ilike(schema.users.fullName, like),
      );
      if (matches) conditions.push(matches);
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        auditLogId: schema.auditLog.auditLogId,
        ticketId: schema.auditLog.ticketId,
        ticketNo: schema.tickets.ticketNo,
        action: schema.auditLog.action,
        fieldName: schema.auditLog.fieldName,
        previousValue: schema.auditLog.previousValue,
        newValue: schema.auditLog.newValue,
        updatedBy: schema.auditLog.updatedBy,
        updatedByName: schema.users.fullName,
        updatedAt: schema.auditLog.updatedAt,
      })
      .from(schema.auditLog)
      .innerJoin(schema.tickets, eq(schema.auditLog.ticketId, schema.tickets.ticketId))
      .leftJoin(schema.users, eq(schema.auditLog.updatedBy, schema.users.userId))
      .where(where)
      .orderBy(desc(schema.auditLog.updatedAt))
      .limit(query.limit)
      .offset(query.offset);

    // Same joins as the page query: `q` can match a column from either, so counting over a
    // narrower FROM would report a total the rows disagree with.
    const [totals] = await this.db
      .select({ value: count() })
      .from(schema.auditLog)
      .innerJoin(schema.tickets, eq(schema.auditLog.ticketId, schema.tickets.ticketId))
      .leftJoin(schema.users, eq(schema.auditLog.updatedBy, schema.users.userId))
      .where(where);

    return {
      items: rows.map((r) => ({
        auditLogId: r.auditLogId,
        ticketId: r.ticketId,
        ticketNo: r.ticketNo,
        action: r.action,
        fieldName: r.fieldName,
        previousValue: r.previousValue,
        newValue: r.newValue,
        updatedBy: r.updatedBy,
        updatedByName: r.updatedByName,
        updatedAt: new Date(r.updatedAt).toISOString(),
      })),
      total: totals?.value ?? 0,
    };
  }

  /** Immutable history for a ticket, newest first — served via M5's `GET /tickets/:id`. */
  async history(ticketId: string): Promise<AuditEntryDto[]> {
    // The actor's NAME is resolved here, at the boundary. The UI used to look it up against
    // the admin-only `/users` list, so IT Staff saw every entry as "System user" — the
    // history was legible only to admins. `updated_by` stays the canonical id.
    const rows = await this.db
      .select({
        auditLogId: schema.auditLog.auditLogId,
        action: schema.auditLog.action,
        fieldName: schema.auditLog.fieldName,
        previousValue: schema.auditLog.previousValue,
        newValue: schema.auditLog.newValue,
        updatedBy: schema.auditLog.updatedBy,
        updatedByName: schema.users.fullName,
        updatedAt: schema.auditLog.updatedAt,
      })
      .from(schema.auditLog)
      .leftJoin(schema.users, eq(schema.auditLog.updatedBy, schema.users.userId))
      .where(eq(schema.auditLog.ticketId, ticketId))
      .orderBy(desc(schema.auditLog.updatedAt));
    return rows.map((r) => ({
      auditLogId: r.auditLogId,
      action: r.action,
      fieldName: r.fieldName,
      previousValue: r.previousValue,
      newValue: r.newValue,
      updatedBy: r.updatedBy,
      updatedByName: r.updatedByName,
      updatedAt: new Date(r.updatedAt).toISOString(),
    }));
  }
}

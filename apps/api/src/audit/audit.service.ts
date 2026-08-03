import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { schema, type Db, type Tx } from "@11ftc/db";
import type { AuditAction, AuditEntryDto, AuthContext } from "@11ftc/shared";
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

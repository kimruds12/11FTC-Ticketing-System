import { z } from "zod";
import { AuditAction } from "../enums.js";

/**
 * M6 — one audit entry (a single changed field). This is the immutable history returned by
 * `GET /tickets/:id`. Written one-row-per-changed-field, in the same transaction as the
 * change it describes (FR-33/34). Never mutated or deleted (FR-35).
 */
export interface AuditEntryDto {
  auditLogId: string;
  action: AuditAction;
  fieldName: string;
  previousValue: string | null;
  newValue: string | null;
  /** `public.users.user_id` of the actor (from the verified session, never the body). */
  updatedBy: string;
  /** Denormalized at the boundary so the history is readable without the admin-only /users. */
  updatedByName: string | null;
  updatedAt: string;
}

/* ── Cross-ticket audit feed (FR-40) ────────────────────────────────────────────────── */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

export const auditActionSchema = z.enum([
  AuditAction.CREATE,
  AuditAction.UPDATE,
  AuditAction.ASSIGN,
  AuditAction.STATUS_CHANGE,
  AuditAction.CLOSE,
]);

/**
 * FR-40 — the administrator's view ACROSS tickets, as opposed to `AuditEntryDto`, which is
 * one ticket's history riding along on `GET /tickets/:id`.
 *
 * `q` matches the ticket number or the changed field's values, because the two questions an
 * administrator actually arrives with are "what happened to IT-2026-0181?" and "who changed
 * a status yesterday?". Dates filter on the entry's own `updated_at` — when the change was
 * made — never on the ticket's `date`, which is when the concern was reported.
 */
export const auditLogQuerySchema = z.object({
  q: z.string().trim().optional(),
  action: auditActionSchema.optional(),
  updatedBy: z.uuid().optional(),
  ticketId: z.uuid().optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

/**
 * One entry, plus the ticket it belongs to. The ticket number is denormalized here for the
 * same reason `updatedByName` is: a feed that shows only ids is unreadable, and resolving
 * them client-side would need a second admin-only call per row.
 */
export interface AuditLogItemDto extends AuditEntryDto {
  ticketId: string;
  ticketNo: string;
}

export interface AuditLogListResult {
  items: AuditLogItemDto[];
  total: number;
}

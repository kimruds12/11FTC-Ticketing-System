import type { AuditAction } from "../enums.js";

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

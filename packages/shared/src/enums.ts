/**
 * Domain enums shared across API, worker, and web. These are the vocabulary of the
 * system; they must match the Postgres enums in `@11ftc/db`. Source of truth for the
 * shapes: `docs/diagrams/01-erd.d2` and SRS §6C.
 */

/** SRS §3 / §6C — the only two roles. `VIEWER` is not a role (it was invented and removed). */
export const UserRole = {
  IT_ADMINISTRATOR: "IT_ADMINISTRATOR",
  IT_STAFF: "IT_STAFF",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** SRS §4.1 — three statuses only. Closed is terminal. No Voided. */
export const TicketStatus = {
  OPEN: "Open",
  ONGOING: "Ongoing",
  CLOSED: "Closed",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

/** M6 — audit actions, one row per changed field. */
export const AuditAction = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  ASSIGN: "ASSIGN",
  STATUS_CHANGE: "STATUS_CHANGE",
  CLOSE: "CLOSE",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

/** M7 — outbox row lifecycle. */
export const OutboxStatus = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
} as const;
export type OutboxStatus = (typeof OutboxStatus)[keyof typeof OutboxStatus];

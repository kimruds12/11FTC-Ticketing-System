import { pgEnum } from "drizzle-orm/pg-core";

// Postgres enums — must match @11ftc/shared/enums. ERD rev 4.
export const userRole = pgEnum("user_role", ["IT_ADMINISTRATOR", "IT_STAFF"]);
export const ticketStatus = pgEnum("ticket_status", ["Open", "Ongoing", "Closed"]);
export const auditAction = pgEnum("audit_action", [
  "CREATE",
  "UPDATE",
  "ASSIGN",
  "STATUS_CHANGE",
  "CLOSE",
]);
/** M10 — ticket provenance. 'IMPORT' rows came from the legacy sheet and lack `ongoing_at`. */
export const ticketSource = pgEnum("ticket_source", ["APP", "IMPORT"]);
export const outboxOperation = pgEnum("outbox_operation", ["UPSERT"]);
export const outboxStatus = pgEnum("outbox_status", ["PENDING", "SENT", "FAILED"]);

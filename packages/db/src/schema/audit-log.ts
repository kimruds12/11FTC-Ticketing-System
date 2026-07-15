import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { auditAction } from "./enums.js";
import { tickets } from "./tickets.js";
import { users } from "./users.js";

/**
 * AuditLog (M6). One row PER changed field, written at the application layer (not DB
 * triggers — triggers can't see updated_by, which lives in the HTTP session), in the
 * same transaction as the change it describes.
 *
 * Immutable (FR-35): there is no update or delete route. CI greps for DELETEs here.
 */
export const auditLog = pgTable("audit_log", {
  auditLogId: uuid("audit_log_id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => tickets.ticketId),
  action: auditAction("action").notNull(),
  fieldName: varchar("field_name", { length: 64 }).notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  updatedBy: uuid("updated_by")
    .notNull()
    .references(() => users.userId),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

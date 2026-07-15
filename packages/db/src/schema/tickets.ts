import {
  pgTable,
  uuid,
  varchar,
  integer,
  date,
  text,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { ticketStatus } from "./enums.js";
import { employees } from "./employees.js";
import { mainIssueCategory } from "./main-issue-category.js";
import { users } from "./users.js";
import { ticketSequence } from "./ticket-sequence.js";

/**
 * Ticket (M5). `ticket_no` is persisted once and never recomputed on read, so backdated
 * rows keep their number. `ongoing_at` and `closed_at` are set once, at transition.
 *
 * INVARIANTS enforced by the DB here:
 *   - uq_ticket_seq UNIQUE (sequence_scope, sequence_number) — the last line of defence
 *     for numbering, survives any future code path.
 *   - ticket_no UNIQUE.
 * There is NO delete path (FR-9). Corrections are edits; the audit log carries them.
 */
export const tickets = pgTable(
  "tickets",
  {
    ticketId: uuid("ticket_id").primaryKey().defaultRandom(),
    ticketNo: varchar("ticket_no", { length: 32 }).notNull().unique(),
    date: date("date").notNull(),
    sequenceScope: varchar("sequence_scope", { length: 32 })
      .notNull()
      .references(() => ticketSequence.scopeKey),
    sequenceNumber: integer("sequence_number").notNull(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.employeeId),
    mainIssueId: uuid("main_issue_id")
      .notNull()
      .references(() => mainIssueCategory.mainIssueId),
    concern: text("concern").notNull(),
    assignedTo: uuid("assigned_to").references(() => users.userId),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.userId),
    status: ticketStatus("status").notNull(),
    remarks: text("remarks"),
    ongoingAt: timestamp("ongoing_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Drizzle 0.36+ takes an ARRAY from the table-config callback (object form is deprecated).
  (t) => [
    unique("uq_ticket_seq").on(t.sequenceScope, t.sequenceNumber),
    index("idx_tickets_date").on(t.date),
    index("idx_tickets_status").on(t.status),
    index("idx_tickets_assigned_status").on(t.assignedTo, t.status),
    index("idx_tickets_closed_at").on(t.closedAt),
  ],
);

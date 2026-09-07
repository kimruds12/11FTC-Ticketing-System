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
import { ticketStatus, ticketSource } from "./enums.js";
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
    /**
     * WHO HANDLED THIS lives in `ticket_assignees`, not here (ADR-0017). The old
     * `assigned_to` FK + `assigned_label` text pair could not express two-technician work
     * without every caller branching on "account or string?", and left FR-19 blind to the
     * 74% of tickets recorded as a label. Do not add an assignment column back.
     */
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.userId),
    status: ticketStatus("status").notNull(),
    remarks: text("remarks"),
    /**
     * Provenance (M10). 'APP' = encoded through this system. 'IMPORT' = loaded once from the
     * legacy spreadsheet, where `ongoing_at` was never recorded — so FR-23 (first-time fix)
     * MUST exclude 'IMPORT' rows or it reports ~100% on data that never carried the signal.
     * Nothing is ever deleted (FR-9), so this column is also the only way to tell the two
     * populations apart after the fact.
     */
    source: ticketSource("source").notNull().default("APP"),
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
    index("idx_tickets_closed_at").on(t.closedAt),
  ],
);

import { pgTable, uuid, integer, primaryKey, index } from "drizzle-orm/pg-core";
import { tickets } from "./tickets.js";
import { technicians } from "./technicians.js";

/**
 * Who handled a ticket (M5). Replaces the old `tickets.assigned_to` FK + `assigned_label`
 * pair, which forced every caller to ask "is this an account or a string?" and left FR-19
 * blind to 74% of the tickets — the ones recorded as "Kim/Paul", "Patrick", "IT Team"
 * (ADR-0017).
 *
 * Many-to-many because two-technician work is 21% of the real history, not an edge case.
 * `position` preserves the order the encoder typed, so the sheet's column G round-trips as
 * "Kim/Paul" and not "Paul/Kim".
 *
 * The composite PK is what makes re-assignment idempotent: writing the same pair twice is a
 * no-op, never a duplicate row.
 */
export const ticketAssignees = pgTable(
  "ticket_assignees",
  {
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.ticketId),
    technicianId: uuid("technician_id")
      .notNull()
      .references(() => technicians.technicianId),
    /** 0-based display order — the sheet joins names with "/" in this order. */
    position: integer("position").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.ticketId, t.technicianId] }),
    // FR-19 groups by technician across all tickets; the PK's leading column can't serve it.
    index("idx_ticket_assignees_technician").on(t.technicianId),
  ],
);

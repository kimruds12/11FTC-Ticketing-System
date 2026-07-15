import { pgTable, varchar, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * TicketSequence (M3). One row per scope. Allocation is the atomic
 * `INSERT ... ON CONFLICT (scope_key) DO UPDATE SET last_sequence = last_sequence + 1
 * RETURNING last_sequence`, run inside the caller's transaction. NEVER SELECT MAX()+1.
 *
 * scope_key is '2026-07-15' (date-scoped) or '2026' (year-scoped) — OPEN-1. Same table,
 * same lock, same code path either way.
 */
export const ticketSequence = pgTable("ticket_sequence", {
  scopeKey: varchar("scope_key", { length: 32 }).primaryKey(),
  lastSequence: integer("last_sequence").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

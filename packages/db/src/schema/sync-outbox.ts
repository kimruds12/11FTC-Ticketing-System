import { pgTable, uuid, varchar, integer, jsonb, text, timestamp, index } from "drizzle-orm/pg-core";
import { outboxOperation, outboxStatus } from "./enums.js";
import { tickets } from "./tickets.js";

/**
 * SyncOutbox (M7). The durable record of "the sheet owes an update". Written in the SAME
 * transaction as the ticket, so "ticket exists" and "sync pending" are atomically true
 * together. BullMQ is only a trigger; correctness lives here.
 *
 *   - row_key = ticket_no. Locates the sheet row by CONTENT, not position.
 *   - raw_row_number is a CACHE ONLY of the row index in the append-only _raw tab; safe
 *     because _raw never shifts. If absent/stale, M8 falls back to scanning for row_key.
 */
export const syncOutbox = pgTable(
  "sync_outbox",
  {
    outboxId: uuid("outbox_id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.ticketId),
    operation: outboxOperation("operation").notNull().default("UPSERT"),
    rowKey: varchar("row_key", { length: 32 }).notNull(),
    payload: jsonb("payload").notNull(),
    status: outboxStatus("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    rawRowNumber: integer("raw_row_number"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  // Drizzle 0.36+ takes an ARRAY from the table-config callback (object form is deprecated).
  (t) => [index("idx_outbox_status_created").on(t.status, t.createdAt)],
);

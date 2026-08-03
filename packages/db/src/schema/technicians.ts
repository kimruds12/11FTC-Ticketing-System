import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Technician (M2 directory + M5 inline resolve-or-create) — the IT person who HANDLED a
 * ticket. Deliberately NOT an account: attribution must not require a login (ADR-0017).
 * "Patrick" handled 104 tickets and has never signed in; forcing an account for him would
 * make encoding depend on user provisioning, which is exactly the friction this replaces.
 *
 * `user_id` is an OPTIONAL bridge for the people who do have accounts, so "my tickets" and
 * per-account views can resolve. Attribution never reads it — analytics group by technician.
 *
 * Dedup mirrors employees exactly: `name_normalized` UNIQUE + the shared `normalizeName`.
 * One function, one place — if the app's normalize and this column diverge, the unique index
 * and the lookup disagree. Nothing is deleted; retire with `is_active`.
 */
export const technicians = pgTable("technicians", {
  technicianId: uuid("technician_id").primaryKey().defaultRandom(),
  /** The short form the team actually writes on the sheet: "Kim", "Paul", "Patrick". */
  name: varchar("name", { length: 120 }).notNull(),
  nameNormalized: varchar("name_normalized", { length: 120 }).notNull().unique(),
  userId: uuid("user_id").references(() => users.userId),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

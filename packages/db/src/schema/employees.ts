import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { departments } from "./departments.js";

/**
 * Employee (M4). `name_normalized` = lower + trim + collapse-whitespace of `name`, with a
 * UNIQUE constraint — this is the guarantee that blocks duplicate employees created
 * inline from the ticket form ("Juan Dela Cruz" / "juan dela cruz" / "Juan  Dela Cruz").
 *
 * INVARIANT: the app's normalize() must compute exactly this column. One function, one
 * place — if they diverge, the unique index and the lookup disagree (M4 invariant 1).
 */
export const employees = pgTable("employees", {
  employeeId: uuid("employee_id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  nameNormalized: varchar("name_normalized", { length: 255 }).notNull().unique(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.departmentId),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

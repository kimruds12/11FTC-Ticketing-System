import { pgTable, uuid, varchar, boolean } from "drizzle-orm/pg-core";

/**
 * Department lookup (M2). Contents are OPEN-4 — seeded by the IT team, never invented.
 * Retiring one sets is_active = false; it is never deleted, so historical tickets keep
 * a readable department name.
 */
export const departments = pgTable("departments", {
  departmentId: uuid("department_id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
});

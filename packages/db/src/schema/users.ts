import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { userRole } from "./enums.js";

/**
 * public.users — the User entity (M1 invariant 1). This is NOT auth.users. Supabase Auth
 * owns auth.users; our FKs (assigned_to, created_by, updated_by) reference THIS table.
 * A deactivated user (is_active = false) is rejected even with a valid JWT.
 */
export const users = pgTable("users", {
  userId: uuid("user_id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: userRole("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

import { pgTable, uuid, varchar, integer, boolean } from "drizzle-orm/pg-core";

/**
 * MainIssueCategory lookup (M2). A foreign key, NOT free text — otherwise "Printer",
 * "printer", and "Printer Issue" become three categories and every chart is noise
 * (System Design §4). Contents are OPEN-4.
 */
export const mainIssueCategory = pgTable("main_issue_category", {
  mainIssueId: uuid("main_issue_id").primaryKey().defaultRandom(),
  label: varchar("label", { length: 255 }).notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

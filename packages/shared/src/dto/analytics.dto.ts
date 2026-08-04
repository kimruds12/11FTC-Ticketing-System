import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

/**
 * How a time series is bucketed. Separate from the window on purpose: "the last 12 months,
 * by month" and "the last 12 months, by day" are both useful and answer different questions.
 * Buckets are `date_trunc`-aligned, so a week always starts Monday and a month on the 1st —
 * never a rolling offset from today, which would make two refreshes disagree.
 */
export const granularityEnum = z.enum(["day", "week", "month"]);
export const granularitySchema = granularityEnum.default("day");
export type Granularity = z.infer<typeof granularityEnum>;

/** Optional date window (inclusive). Applied to `date` (volume) or `closed_at` (solved). */
export const analyticsWindowSchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  granularity: granularitySchema,
});
export type AnalyticsWindow = z.infer<typeof analyticsWindowSchema>;

/**
 * A point in a time series (FR-17 volume, FR-21 solved). `date` is the START of the bucket,
 * so a `month` series reads 2026-06-01, 2026-07-01 — the caller formats the label.
 */
export interface DatePoint {
  date: string;
  count: number;
}

/** A labeled count (FR-18 department, FR-19 technician, FR-20 category). */
export interface CountPoint {
  key: string;
  count: number;
}

/** FR-22 — current status distribution. */
export interface StatusCounts {
  open: number;
  ongoing: number;
  closed: number;
  total: number;
}

/**
 * FR-23 — first-time fix. `ongoing_at IS NULL` on a Closed ticket IS the signal (no extra
 * column): it was solved without ever passing through Ongoing.
 */
export interface FirstTimeFixDto {
  closed: number;
  firstTimeFix: number;
  rate: number;
}

/** FR-24 — an Ongoing ticket and how long it has been Ongoing. */
export interface OngoingAgeingItem {
  ticketId: string;
  ticketNo: string;
  ongoingAt: string;
  ageDays: number;
}

/* ── Reports (FR-36..FR-38) ─────────────────────────────────────────────────────────── */

/**
 * FR-36 — the report cross-tab query. Same window as the dashboard, plus two lookup filters,
 * and it defaults to `month`: a report is read a period at a time, where the dashboard is
 * read a day at a time.
 *
 * The filters are IDs, not labels. The page's dropdowns are fed by `/departments` and
 * `/main-issues`, so filtering by a name would mean matching a string the user could not
 * have typed wrong — and would silently return nothing the day someone renames a lookup.
 */
export const reportQuerySchema = analyticsWindowSchema.extend({
  granularity: granularityEnum.default("month"),
  departmentId: z.uuid().optional(),
  mainIssueId: z.uuid().optional(),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;

/** One department's row of the cross-tab. `counts` is positionally aligned to `buckets`. */
export interface ReportRow {
  key: string;
  counts: number[];
  total: number;
}

/**
 * FR-36 — tickets per department per period.
 *
 * `grandTotal` is the count of tickets in the window, exactly — `tickets.employee_id` and
 * `employees.department_id` are both NOT NULL, so no ticket can fall outside a department
 * row. A report whose total silently disagrees with the ticket list would be worse than no
 * report, so this is asserted in the spec, not just assumed.
 */
export interface ReportMatrixDto {
  buckets: string[];
  rows: ReportRow[];
  columnTotals: number[];
  grandTotal: number;
}

/**
 * FR-37 — the full extent of encoded ticket dates, ignoring every filter. The period picker
 * is built from this, so it can never offer a month with no data or omit one with data.
 * `from`/`to` are null on an empty database.
 */
export interface CoverageDto {
  from: string | null;
  to: string | null;
  total: number;
}

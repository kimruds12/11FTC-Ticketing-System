import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

/**
 * How a time series is bucketed. Separate from the window on purpose: "the last 12 months,
 * by month" and "the last 12 months, by day" are both useful and answer different questions.
 * Buckets are `date_trunc`-aligned, so a week always starts Monday and a month on the 1st —
 * never a rolling offset from today, which would make two refreshes disagree.
 */
export const granularitySchema = z.enum(["day", "week", "month"]).default("day");
export type Granularity = z.infer<typeof granularitySchema>;

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

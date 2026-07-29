import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

/** Optional date window (inclusive). Applied to `date` (volume) or `closed_at` (solved). */
export const analyticsWindowSchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type AnalyticsWindow = z.infer<typeof analyticsWindowSchema>;

/** A point in a by-date series (FR-17 volume, FR-21 solved). */
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

import type { AnalyticsWindow, Granularity } from "@11ftc/shared";

/**
 * Dashboard time controls (M9).
 *
 * RANGE and GRANULARITY are separate on purpose — "the last 30 days, by day" and "the last 30
 * days, by week" answer different questions, and collapsing them into one pill row means you
 * can never ask the second one. Each range carries a sensible default granularity; the user
 * can override it.
 */
export type RangeKey = "today" | "week" | "month" | "year" | "all";

export interface RangeSpec {
  key: RangeKey;
  label: string;
  /** Granularity that reads best for this span, applied when the range changes. */
  defaultGranularity: Granularity;
}

export const RANGES: RangeSpec[] = [
  { key: "today", label: "Today", defaultGranularity: "day" },
  { key: "week", label: "Last 7 days", defaultGranularity: "day" },
  { key: "month", label: "Last 30 days", defaultGranularity: "day" },
  { key: "year", label: "This year", defaultGranularity: "month" },
  { key: "all", label: "All time", defaultGranularity: "month" },
];

export const GRANULARITIES: Array<{ key: Granularity; label: string }> = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
];

/** Local calendar date, NOT `toISOString()` — that shifts to UTC and can report yesterday. */
function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function windowFor(range: RangeKey, granularity: Granularity): AnalyticsWindow {
  const to = ymd(new Date());
  switch (range) {
    case "today":
      return { from: to, to, granularity };
    case "week":
      return { from: ymd(daysAgo(6)), to, granularity };
    case "month":
      return { from: ymd(daysAgo(29)), to, granularity };
    case "year":
      return { from: `${new Date().getFullYear()}-01-01`, to, granularity };
    case "all":
      return { granularity };
  }
}

/**
 * Human description of the window, for empty states. Saying "no tickets between 2026-07-28 and
 * 2026-08-03" is the difference between "the dashboard is broken" and "you picked a quiet
 * week" — worth the few lines.
 */
export function describeWindow(w: AnalyticsWindow): string {
  if (!w.from && !w.to) return "across all recorded tickets";
  if (w.from && w.to && w.from === w.to) return `on ${w.from}`;
  if (w.from && w.to) return `between ${w.from} and ${w.to}`;
  return w.from ? `since ${w.from}` : `up to ${w.to}`;
}

/** Bucket start → axis label. A month bucket reading "2026-07-01" should say "Jul 2026". */
export function bucketLabel(iso: string, g: Granularity): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  if (g === "month") {
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  const short = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return g === "week" ? `wk of ${short}` : short;
}

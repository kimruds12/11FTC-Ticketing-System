import type { CoverageDto } from "@11ftc/shared";

/**
 * Report period helpers.
 *
 * The month list is derived from `/analytics/coverage` — the real min/max encoded date —
 * rather than hardcoded. A hardcoded list is wrong twice: it offers months with no data
 * (an empty report that looks like a bug) and hides months that have some (a report that
 * silently omits real tickets). It also goes stale every January without anyone noticing.
 *
 * All arithmetic here is on `YYYY-MM` strings, never on `Date`. Constructing a Date from an
 * ISO day string parses as UTC and can land on the previous month for anyone west of
 * Greenwich — the same class of off-by-one that made the ticket dates render a day early.
 */

/** A month key, `YYYY-MM`. */
export type MonthKey = string;

export function monthKeyOf(isoDate: string): MonthKey {
  return isoDate.slice(0, 7);
}

/** Every month from `a` to `b` inclusive, ascending. Returns [] if the range is inverted. */
export function monthsBetween(a: MonthKey, b: MonthKey): MonthKey[] {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  if (!ay || !am || !by || !bm) return [];

  const out: MonthKey[] = [];
  let y = ay;
  let m = am;
  // Bounded by construction, but cap anyway: a corrupt coverage response must not spin.
  for (let guard = 0; guard < 1200; guard++) {
    if (y > by || (y === by && m > bm)) break;
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** The months a report can cover, newest first (the order a picker should offer them). */
export function monthOptions(coverage: CoverageDto | null): MonthKey[] {
  if (!coverage?.from || !coverage.to) return [];
  return monthsBetween(monthKeyOf(coverage.from), monthKeyOf(coverage.to)).reverse();
}

export function monthStart(m: MonthKey): string {
  return `${m}-01`;
}

/** Last day of the month. `new Date(y, m, 0)` is day 0 of the NEXT month = last of this. */
export function monthEnd(m: MonthKey): string {
  const [y, mm] = m.split("-").map(Number);
  if (!y || !mm) return `${m}-28`;
  const day = new Date(y, mm, 0).getDate();
  return `${m}-${String(day).padStart(2, "0")}`;
}

export function monthLabel(m: MonthKey): string {
  const [y, mm] = m.split("-").map(Number);
  if (!y || !mm) return m;
  return new Date(y, mm - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Column header for a bucket start returned by the API (`YYYY-MM-DD`).
 *
 * The report's own granularity, not the dashboard's — a month column reads "Jul 2026", a
 * week column names the Monday it starts on.
 */
export function columnLabel(bucketStart: string, granularity: "day" | "week" | "month"): string {
  const [y, m, d] = bucketStart.split("-").map(Number);
  if (!y || !m || !d) return bucketStart;
  const date = new Date(y, m - 1, d); // local — the parts are already calendar values
  if (granularity === "month") {
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  const short = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return granularity === "week" ? `wk of ${short}` : short;
}

/** How many months back the picker opens on, when there is that much history. */
export const DEFAULT_SPAN_MONTHS = 6;

/** Initial `[from, to]` selection: the most recent `DEFAULT_SPAN_MONTHS` of real data. */
export function defaultSelection(months: MonthKey[]): [MonthKey, MonthKey] | null {
  if (!months.length) return null;
  const newest = months[0]!; // months are newest-first
  const oldest = months[Math.min(months.length, DEFAULT_SPAN_MONTHS) - 1]!;
  return [oldest, newest];
}

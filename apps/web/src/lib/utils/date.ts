/**
 * Date display, matching the IT team's spreadsheet: **M/D/YYYY**.
 *
 * The API always speaks ISO (`YYYY-MM-DD`) — that stays the wire format, because it sorts
 * lexicographically and is unambiguous. This is presentation only, and it deliberately mirrors
 * what the sync writes into the sheet's column A, so a ticket reads the same in both places.
 *
 * Parsed manually rather than via `new Date(iso)`: that constructor treats a bare `YYYY-MM-DD`
 * as UTC midnight, so anyone west of Greenwich sees the PREVIOUS day. For a date with no time
 * component the calendar parts are the whole truth — there is nothing to convert.
 */
export function formatSheetDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[2])}/${Number(m[3])}/${m[1]}`;
}

/** A timestamp (audit entries, created/closed): M/D/YYYY plus the clock time. */
export function formatSheetStamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}, ${time}`;
}

import type { ReportMatrixDto } from "@11ftc/shared";
import { csvCell as cell } from "@/lib/utils";

/**
 * CSV export for the report cross-tab.
 *
 * Primitives (escaping, the formula-injection guard, the download) live in
 * `lib/utils/csv` — Audit Logs exports too, and that guard must not exist in two copies.
 *
 * CSV rather than a real .xlsx: the deliverable is a flat table of names and integers, Excel
 * opens CSV natively, and a spreadsheet library would add a dependency and a build step to
 * produce the same grid. The button says "Export CSV" for that reason — labelling a CSV
 * "Export Excel" is the kind of small lie that turns into a support question.
 */

export interface CsvMeta {
  /** Human description of the window and filters, written above the table. */
  title: string;
  subtitle: string;
}

export function reportToCsv(
  matrix: ReportMatrixDto,
  columnHeaders: string[],
  meta: CsvMeta,
): string {
  const lines: string[] = [];

  // Provenance rows. A report that leaves the app with no record of what it was filtered to
  // is a number without a question attached — and these files get forwarded.
  lines.push([cell(meta.title)].join(","));
  lines.push([cell(meta.subtitle)].join(","));
  lines.push("");

  lines.push(["Department", ...columnHeaders, "Total"].map(cell).join(","));
  for (const row of matrix.rows) {
    lines.push([cell(row.key), ...row.counts.map(cell), cell(row.total)].join(","));
  }
  lines.push(
    [cell("GRAND TOTAL"), ...matrix.columnTotals.map(cell), cell(matrix.grandTotal)].join(","),
  );

  return lines.join("\r\n");
}

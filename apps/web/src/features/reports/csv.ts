import type { ReportMatrixDto } from "@11ftc/shared";

/**
 * CSV export for the report cross-tab.
 *
 * CSV rather than a real .xlsx: the deliverable is a flat table of names and integers, Excel
 * opens CSV natively, and a spreadsheet library would add a dependency and a build step to
 * produce the same grid. The button says "Export CSV" for that reason — labelling a CSV
 * "Export Excel" is the kind of small lie that turns into a support question.
 */

/**
 * Neutralize spreadsheet formula injection.
 *
 * A cell beginning `= + - @` (or tab/CR) is evaluated as a FORMULA when the file is opened,
 * and department and issue labels are user-authored — an admin can name a department
 * anything. Same guard, same reasoning as `apps/api/src/sync/sheets.client.ts`: prefix with
 * an apostrophe so the value is read as text. The apostrophe is visible in the cell, which
 * is the correct trade — a visibly odd label beats a spreadsheet that runs something.
 */
function neutralize(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** RFC 4180: quote everything, double any embedded quote. Simplest thing that is correct. */
function cell(value: string | number): string {
  const s = typeof value === "number" ? String(value) : neutralize(value);
  return `"${s.replace(/"/g, '""')}"`;
}

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

/**
 * Trigger a browser download. The BOM matters: without it Excel decodes the file as the
 * system codepage and mangles any non-ASCII name (`Señor` → `SeÃ±or`).
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

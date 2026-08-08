/**
 * CSV primitives shared by every export in the app.
 *
 * These live in `lib/utils` rather than inside one feature because two features now export
 * CSV (Reports and Audit Logs), and features must never import each other — the injection
 * guard below is exactly the kind of rule that must not exist in only one of two copies.
 */

/**
 * Neutralize spreadsheet formula injection.
 *
 * A cell beginning `= + - @` (or tab/CR) is evaluated as a FORMULA when the file is opened.
 * Exported values here are user-authored — department names, employee names, concern text,
 * audit values — so prefixing with an apostrophe makes the value read as text. The
 * apostrophe is visible in the cell, which is the right trade: a visibly odd label beats a
 * spreadsheet that runs something. Same guard, same reasoning as `sync/sheets.client.ts`.
 */
export function neutralizeCsvValue(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** RFC 4180: quote everything, double any embedded quote. Simplest thing that is correct. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return `""`;
  const s = typeof value === "number" ? String(value) : neutralizeCsvValue(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Join rows with CRLF, which is what RFC 4180 specifies and what Excel is happiest with. */
export function csvRows(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
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

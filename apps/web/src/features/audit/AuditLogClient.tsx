"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AuditAction, type AuditLogItemDto } from "@11ftc/shared";
import { useDebounce } from "@/hooks/useDebounce";
import { csvRows, downloadCsv, formatSheetStamp } from "@/lib/utils";

/**
 * Audit Logs (M6, FR-40) — read-only, administrator-only.
 *
 * Filtering and paging happen on the API, not over a page of rows. The audit table only ever
 * grows (nothing is deleted, FR-35), so it is the last dataset that should be pulled into the
 * browser to be filtered there.
 *
 * This screen replaces one built on `const mockAuditLogs: AuditLogEntry[] = []` — a filter
 * toolbar over an empty array that could never show anything, against a table that already
 * held real entries.
 */
export interface AuditFilterValues {
  q: string;
  action: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY: AuditFilterValues = { q: "", action: "", dateFrom: "", dateTo: "" };

/** Colour carries the ACTION, the one field you scan a log for. */
const ACTION_STYLE: Record<string, string> = {
  [AuditAction.CREATE]: "bg-green-50 text-green-700 border-green-200",
  [AuditAction.UPDATE]: "bg-blue-50 text-blue-700 border-blue-200",
  [AuditAction.ASSIGN]: "bg-purple-50 text-purple-700 border-purple-200",
  [AuditAction.STATUS_CHANGE]: "bg-amber-50 text-amber-700 border-amber-200",
  [AuditAction.CLOSE]: "bg-red-50 text-red-700 border-red-200",
};

/** `main_issue_id` → "Main issue". The column stores DB field names; people read English. */
function humanField(field: string): string {
  return field
    .replace(/_id$/, "")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function buildQuery(f: AuditFilterValues, offset: number, limit: number): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  if (offset > 0) p.set("offset", String(offset));
  if (limit !== 50) p.set("limit", String(limit));
  return p.toString();
}

export default function AuditLogClient({
  entries,
  total,
  limit,
  offset,
  initialFilters,
  loadError,
}: {
  entries: AuditLogItemDto[];
  total: number;
  limit: number;
  offset: number;
  initialFilters: AuditFilterValues;
  loadError: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<AuditFilterValues>(initialFilters);
  const [pageOffset, setPageOffset] = useState(offset);
  const debouncedQ = useDebounce(filters.q, 350);

  const targetQuery = useMemo(
    () => buildQuery({ ...filters, q: debouncedQ }, pageOffset, limit),
    [filters, debouncedQ, pageOffset, limit],
  );

  useEffect(() => {
    const current = buildQuery(initialFilters, offset, limit);
    if (targetQuery === current) return;
    router.replace(targetQuery ? `${pathname}?${targetQuery}` : pathname, { scroll: false });
  }, [targetQuery, initialFilters, offset, limit, pathname, router]);

  function change(patch: Partial<AuditFilterValues>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPageOffset(0); // page 3 of the previous result set is meaningless
  }

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + entries.length, total);
  const filtered = Object.values(filters).some(Boolean);

  /**
   * Exports the CURRENT PAGE, and the button says so. Exporting "everything" would need a
   * second unbounded fetch of a table that only grows, and silently returning 50 of 30,000
   * rows under a button labelled "Export" is worse than being explicit.
   */
  function handleExport() {
    const csv = csvRows([
      ["When", "Ticket", "Action", "Field", "Previous", "New", "By"],
      ...entries.map((e) => [
        formatSheetStamp(e.updatedAt),
        e.ticketNo,
        e.action,
        humanField(e.fieldName),
        e.previousValue ?? "",
        e.newValue ?? "",
        e.updatedByName ?? e.updatedBy,
      ]),
    ]);
    downloadCsv(`11ftc-audit-${offset + 1}-${to}.csv`, csv);
  }

  return (
    <div className="space-y-6 w-full px-4 md:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">System Audit Logs</h1>
          <p className="page-subtitle">
            Every recorded change, one row per field. Immutable — entries are never edited or
            removed.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={entries.length === 0}
          className="btn-outline self-start sm:self-auto disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export this page
        </button>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Could not load the audit log: {loadError}
        </div>
      )}

      {/* ── Filters ─────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="audit-q" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Search
            </label>
            <input
              id="audit-q"
              type="text"
              value={filters.q}
              onChange={(e) => change({ q: e.target.value })}
              placeholder="Ticket number, field, value, or who changed it"
              className="input text-sm"
            />
          </div>

          <div>
            <label htmlFor="audit-action" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Action
            </label>
            <select
              id="audit-action"
              value={filters.action}
              onChange={(e) => change({ action: e.target.value })}
              className="input-select text-sm"
            >
              <option value="">All actions</option>
              {Object.values(AuditAction).map((a) => (
                <option key={a} value={a}>{humanField(a)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="audit-from" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Changed from
            </label>
            <input
              id="audit-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => change({ dateFrom: e.target.value })}
              className="input text-sm"
            />
          </div>

          <div>
            <label htmlFor="audit-to" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Changed to
            </label>
            <input
              id="audit-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => change({ dateTo: e.target.value })}
              className="input text-sm"
            />
          </div>
        </div>

        {filtered && (
          <button
            onClick={() => {
              setFilters(EMPTY);
              setPageOffset(0);
            }}
            className="mt-3 text-xs font-bold text-primary-700 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Entries ─────────────────────────────── */}
      <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        {/* Phone: a card per entry. The desktop table carries seven columns, which on a
            375px screen is a sideways drag through data meant to be scanned. */}
        <div className="divide-y divide-gray-100 lg:hidden">
          {entries.map((e) => (
            <div key={e.auditLogId} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/tickets/${e.ticketId}`}
                  className="text-sm font-bold text-gray-900 hover:text-primary-700 hover:underline"
                >
                  {e.ticketNo}
                </Link>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ACTION_STYLE[e.action] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {humanField(e.action)}
                </span>
              </div>
              <p className="mt-1.5 text-xs font-semibold text-gray-700">{humanField(e.fieldName)}</p>
              <p className="mt-0.5 break-words text-xs text-gray-500">
                {e.previousValue ? (
                  <>
                    <span className="line-through">{e.previousValue}</span>
                    {" → "}
                  </>
                ) : null}
                <span className="font-semibold text-gray-900">{e.newValue ?? "—"}</span>
              </p>
              <p className="mt-1.5 text-[11px] font-medium text-gray-400">
                {formatSheetStamp(e.updatedAt)} · {e.updatedByName ?? "Unknown user"}
              </p>
            </div>
          ))}
          {entries.length === 0 && <EmptyState filtered={filtered} />}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                {["When", "Ticket", "Action", "Field", "Change", "By"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e) => (
                <tr key={e.auditLogId} className="transition-colors hover:bg-gray-50/50">
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium tabular-nums text-gray-500">
                    {formatSheetStamp(e.updatedAt)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-bold">
                    <Link href={`/tickets/${e.ticketId}`} className="text-gray-700 transition-colors hover:text-primary-700 hover:underline">
                      {e.ticketNo}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ACTION_STYLE[e.action] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {humanField(e.action)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-gray-700">
                    {humanField(e.fieldName)}
                  </td>
                  <td className="max-w-md px-5 py-4 text-sm">
                    {e.previousValue ? (
                      <span className="text-gray-400 line-through">{e.previousValue}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                    <span className="mx-1.5 text-gray-300">→</span>
                    <span className="font-semibold text-gray-900">{e.newValue ?? "—"}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-600">
                    {e.updatedByName ?? <span className="italic text-gray-400">Unknown user</span>}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState filtered={filtered} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-5 py-3.5 text-xs font-semibold text-gray-400 sm:flex-row">
          <span>
            Showing {from} to {to} of {total} {total === 1 ? "entry" : "entries"}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPageOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setPageOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Distinguishes "your filters matched nothing" from "there is nothing yet". */
function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p className="text-sm font-medium text-gray-400">
        {filtered
          ? "No audit entries match these filters."
          : "No changes have been recorded yet."}
      </p>
    </div>
  );
}

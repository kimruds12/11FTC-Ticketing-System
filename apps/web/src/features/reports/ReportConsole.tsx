"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CoverageDto,
  DepartmentDto,
  Granularity,
  MainIssueDto,
  ReportMatrixDto,
} from "@11ftc/shared";
import { browserApi } from "@/services/browser";
import { analyticsService } from "@/services/analytics.service";
import { lookupsService } from "@/services/lookups.service";
import {
  columnLabel,
  defaultSelection,
  monthEnd,
  monthLabel,
  monthOptions,
  monthStart,
  type MonthKey,
} from "./period";
import { downloadCsv } from "@/lib/utils";
import { reportToCsv } from "./csv";

const GRANULARITIES: Array<{ key: Granularity; label: string }> = [
  { key: "month", label: "Monthly" },
  { key: "week", label: "Weekly" },
  { key: "day", label: "Daily" },
];

interface Filters {
  from: MonthKey;
  to: MonthKey;
  granularity: Granularity;
  departmentId: string;
  mainIssueId: string;
}

const ALL = "";

function sameFilters(a: Filters, b: Filters): boolean {
  return (
    a.from === b.from &&
    a.to === b.to &&
    a.granularity === b.granularity &&
    a.departmentId === b.departmentId &&
    a.mainIssueId === b.mainIssueId
  );
}

/**
 * Report Console (FR-36..FR-38) — tickets per department per period, from the database.
 *
 * This screen was a mock-up: every figure came from a hardcoded map, the dropdowns listed
 * departments that did not exist, and a badge claimed the numbers were synced with Google
 * Sheets. Everything below now comes from `/analytics/report`, `/analytics/coverage`,
 * `/departments` and `/main-issues`.
 *
 * Two states are kept: `filters` (what the form shows) and `applied` (what was last
 * generated). A report you can hand over should be the result of a deliberate action, so
 * changing a dropdown does NOT silently re-run and change the numbers under you — the button
 * tells you the view is stale instead. It does auto-run once on arrival, because a blank
 * screen on load reads as broken.
 */
export default function ReportConsole() {
  const [coverage, setCoverage] = useState<CoverageDto | null>(null);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [mainIssues, setMainIssues] = useState<MainIssueDto[]>([]);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [applied, setApplied] = useState<Filters | null>(null);
  const [matrix, setMatrix] = useState<ReportMatrixDto | null>(null);
  /** The `applied` value the current `matrix` was fetched for — see `loading` below. */
  const [loadedFor, setLoadedFor] = useState<Filters | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  /**
   * DERIVED, not stored. `applied` gets a fresh object identity on every Generate click, so
   * "a request is in flight" is exactly "the applied filters are not the ones we have a
   * result for". Storing it instead would mean a `setLoading(true)` in the effect body —
   * a cascading render, and one more thing that can be left true on an early return.
   */
  const loading = applied !== null && loadedFor !== applied;

  const months = useMemo(() => monthOptions(coverage), [coverage]);

  /* ── Bootstrap: coverage + the real lookup lists ──────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const api = browserApi();
        const analytics = analyticsService(api);
        const lookups = lookupsService(api);
        const [cov, depts, issues] = await Promise.all([
          analytics.coverage(),
          lookups.listDepartments(),
          lookups.listMainIssues(),
        ]);
        if (cancelled) return;
        setCoverage(cov);
        setDepartments(depts.filter((d) => d.isActive));
        setMainIssues(issues.filter((i) => i.isActive));

        const span = defaultSelection(monthOptions(cov));
        if (span) {
          const initial: Filters = {
            from: span[0],
            to: span[1],
            granularity: "month",
            departmentId: ALL,
            mainIssueId: ALL,
          };
          setFilters(initial);
          setApplied(initial); // auto-run the default view
        }
        setLoadError(null);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Could not reach the API.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Fetch whenever a report is APPLIED (never on mere form edits) ────────────── */
  useEffect(() => {
    if (!applied) return;
    let cancelled = false;
    void (async () => {
      try {
        const m = await analyticsService(browserApi()).report({
          from: monthStart(applied.from),
          to: monthEnd(applied.to),
          granularity: applied.granularity,
          departmentId: applied.departmentId || undefined,
          mainIssueId: applied.mainIssueId || undefined,
        });
        if (cancelled) return;
        setMatrix(m);
        setLoadError(null);
      } catch (e) {
        if (cancelled) return;
        // Surface it. Rendering an empty table on a failed request is how the dashboard
        // spent a day looking like "no data" while every call was being blocked by CORS.
        setMatrix(null);
        setLoadError(e instanceof Error ? e.message : "Could not generate the report.");
      } finally {
        // Marks the request settled either way — without this a failed fetch would leave
        // the button reading "Compiling…" forever.
        if (!cancelled) setLoadedFor(applied);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applied]);

  const dirty = filters !== null && applied !== null && !sameFilters(filters, applied);

  const set = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) =>
      setFilters((f) => (f ? { ...f, [key]: value } : f)),
    [],
  );

  /**
   * Columns as {bucket, label} pairs.
   *
   * The label MUST come from `loadedFor`, not `applied`. `applied` changes the instant
   * "Apply changes" is clicked, while `matrix` still holds the previous result until the
   * fetch lands — so reading granularity from `applied` labels the OLD buckets with the NEW
   * granularity. Going Weekly → Monthly rendered five different week columns all headed
   * "Jun 2026": five columns of real, different numbers under one heading. (React only
   * surfaced it as a duplicate-key warning because the label was also the key.)
   *
   * `loadedFor` is set in the same async continuation as `setMatrix`, so the two are
   * always one consistent snapshot.
   */
  const columns = useMemo(
    () =>
      matrix
        ? matrix.buckets.map((bucket) => ({
            bucket,
            label: columnLabel(bucket, loadedFor?.granularity ?? "month"),
          }))
        : [],
    [matrix, loadedFor],
  );

  const deptName = (id: string) =>
    departments.find((d) => d.departmentId === id)?.name ?? "All departments";
  const issueLabel = (id: string) =>
    mainIssues.find((i) => i.mainIssueId === id)?.label ?? "All main issues";

  /**
   * Describes the report ON SCREEN, so it reads from `loadedFor` for the same reason the
   * column labels do — during an in-flight refetch `applied` is already the NEW selection
   * while the table still shows the OLD numbers. This string is also the CSV's subtitle, so
   * getting it from `applied` would let a stale export leave the building describing filters
   * that produced none of its figures.
   */
  const summary = loadedFor
    ? `${monthLabel(loadedFor.from)} – ${monthLabel(loadedFor.to)} · ${
        loadedFor.departmentId ? deptName(loadedFor.departmentId) : "All departments"
      } · ${loadedFor.mainIssueId ? issueLabel(loadedFor.mainIssueId) : "All main issues"}`
    : "";

  const handleExport = () => {
    if (!matrix || !loadedFor) return;
    const csv = reportToCsv(matrix, columns.map((c) => c.label), {
      title: "11FTC IT Tickets — Report Compilation",
      subtitle: summary,
    });
    downloadCsv(`11ftc-tickets-${loadedFor.from}_to_${loadedFor.to}.csv`, csv);
  };

  /* ── Render ───────────────────────────────────────────────────────────────────── */

  if (loadError && !matrix) {
    return (
      <div className="space-y-8 w-full px-4 md:px-8 py-6">
        <Heading />
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          The report could not be loaded: {loadError}
        </div>
      </div>
    );
  }

  if (!filters) {
    return (
      <div className="space-y-8 w-full px-4 md:px-8 py-6">
        <Heading />
        <div className="card p-6">
          <p className="text-sm font-semibold text-gray-500">
            {coverage && coverage.total === 0
              ? "There are no tickets to report on yet."
              : "Loading report options…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full px-4 md:px-8 py-6">
      <Heading />

      {/* ── Report Customizer ─────────────────────────────────────── */}
      <div className="card p-6 space-y-6 print-hide">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Report Console</h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Ticket counts per department per period, read live from the database
            {coverage?.from && coverage.to
              ? ` · ${coverage.total} tickets on record, ${monthLabel(coverage.from.slice(0, 7))} to ${monthLabel(coverage.to.slice(0, 7))}`
              : ""}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <svg className="w-4 h-4 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-xs font-bold text-gray-700 tracking-wider">Report Customizer</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="From month">
              <select
                value={filters.from}
                onChange={(e) => set("from", e.target.value)}
                className="input-select"
              >
                {months.map((m) => (
                  <option key={m} value={m}>{monthLabel(m)}</option>
                ))}
              </select>
            </Field>

            <Field label="To month">
              <select
                value={filters.to}
                onChange={(e) => set("to", e.target.value)}
                className="input-select"
              >
                {months.map((m) => (
                  <option key={m} value={m}>{monthLabel(m)}</option>
                ))}
              </select>
            </Field>

            <Field label="Department">
              <select
                value={filters.departmentId}
                onChange={(e) => set("departmentId", e.target.value)}
                className="input-select"
              >
                <option value={ALL}>All departments</option>
                {departments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Main issue">
              <select
                value={filters.mainIssueId}
                onChange={(e) => set("mainIssueId", e.target.value)}
                className="input-select"
              >
                <option value={ALL}>All main issues</option>
                {mainIssues.map((i) => (
                  <option key={i.mainIssueId} value={i.mainIssueId}>{i.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {monthsInverted(filters) && (
            <p className="text-xs font-semibold text-amber-700">
              “From” is after “To” — the report will be empty until you swap them.
            </p>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                {GRANULARITIES.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => set("granularity", g.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                      filters.granularity === g.key
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setApplied(filters)}
                disabled={loading}
                className={`btn-primary py-2.5 px-6 text-sm font-bold rounded-lg ${
                  dirty ? "bg-primary-700" : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {loading ? "Compiling…" : dirty ? "Apply changes" : "Generate Report"}
              </button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleExport}
                disabled={!matrix}
                className="btn-outline bg-white hover:bg-gray-50 border-gray-200 py-2.5 px-4 text-xs font-bold text-gray-600 disabled:opacity-50"
              >
                Export CSV
              </button>
              <button
                onClick={() => window.print()}
                disabled={!matrix}
                className="btn-outline bg-white hover:bg-gray-50 border-gray-200 py-2.5 px-4 text-xs font-bold text-gray-600 disabled:opacity-50"
              >
                Print / PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Compilation ───────────────────────────────────────────── */}
      <div className="card p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Report Compilation</h2>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">
              Tickets created by department per period (FR-36)
            </p>
          </div>
          {loadedFor && <p className="text-xs font-bold text-gray-600">{summary}</p>}
        </div>

        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 print-hide">
            {loadError}
          </div>
        )}

        {dirty && matrix && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 print-hide">
            Filters have changed. The table below still shows the last generated report —
            click “Apply changes” to update it.
          </div>
        )}

        {matrix && matrix.grandTotal === 0 ? (
          <p className="py-12 text-center text-sm font-semibold text-gray-500">
            No tickets were encoded in this period{loadedFor?.departmentId || loadedFor?.mainIssueId ? " for these filters" : ""}.
          </p>
        ) : matrix ? (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-900">
                  <th className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider">
                    Department
                  </th>
                  {/* Keyed by BUCKET, never by label. The server builds buckets with
                      `[...new Set(...)]`, so they are unique by construction; labels are a
                      display concern and two of them can legitimately coincide. */}
                  {columns.map((c) => (
                    <th key={c.bucket} className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider text-center">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider text-center">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {matrix.rows.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap text-sm font-bold text-gray-900">
                      {row.key}
                    </td>
                    {row.counts.map((n, i) => (
                      <td
                        key={columns[i]?.bucket ?? i}
                        className={`px-6 py-3.5 text-center text-sm tabular-nums ${
                          n === 0 ? "text-gray-300" : "font-semibold text-gray-600"
                        }`}
                      >
                        {n}
                      </td>
                    ))}
                    <td className="px-6 py-3.5 text-center text-sm font-bold text-primary-700 tabular-nums bg-gray-50/50">
                      {row.total}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <td className="px-6 py-4 text-sm text-gray-900">GRAND TOTAL</td>
                  {matrix.columnTotals.map((n, i) => (
                    <td key={columns[i]?.bucket ?? i} className="px-6 py-4 text-center text-sm text-gray-900 tabular-nums">
                      {n}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-center text-sm text-primary-700 tabular-nums bg-gray-100/50">
                    {matrix.grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-12 text-center text-sm font-semibold text-gray-500">
            {loading ? "Compiling…" : "Choose a period and click Generate Report."}
          </p>
        )}
      </div>
    </div>
  );
}

function monthsInverted(f: Filters): boolean {
  return f.from > f.to; // `YYYY-MM` sorts correctly as a string
}

function Heading() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Generate Reports</h1>
      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 print-hide">
        <span>Reports Console</span>
        <span>/</span>
        <span className="font-semibold text-gray-700">Compilation</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

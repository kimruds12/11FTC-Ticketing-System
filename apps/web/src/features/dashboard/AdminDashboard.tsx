"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  CountPoint,
  DatePoint,
  FirstTimeFixDto,
  Granularity,
  StatusCounts,
} from "@11ftc/shared";
import { browserApi } from "@/services/browser";
import { analyticsService } from "@/services/analytics.service";
import StatCard from "./StatCard";
import ResolutionTrendChart from "./ResolutionTrendChart";
import ByDepartmentChart from "./ByDepartmentChart";
import ByTechnicianChart from "./ByTechnicianChart";
import TopIssuesChart from "./TopIssuesChart";
import {
  GRANULARITIES,
  RANGES,
  describeWindow,
  windowFor,
  type RangeKey,
} from "./period";

interface DashData {
  status: StatusCounts;
  solved: DatePoint[];
  byDept: CountPoint[];
  byTech: CountPoint[];
  byCat: CountPoint[];
  ftf: FirstTimeFixDto;
}

const EMPTY: DashData = {
  status: { open: 0, ongoing: 0, closed: 0, total: 0 },
  solved: [],
  byDept: [],
  byTech: [],
  byCat: [],
  ftf: { closed: 0, firstTimeFix: 0, rate: 0 },
};

/**
 * IT Administrator dashboard — live analytics (M9) over the selected range and granularity.
 *
 * The default is ALL TIME, deliberately: the ticket history starts well before today, so a
 * "last 7 days" default renders every chart empty and reads as a broken dashboard.
 */
export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<DashData | null>(null);

  const analyticsWindow = useMemo(
    () => windowFor(range, granularity),
    [range, granularity],
  );
  const windowLabel = describeWindow(analyticsWindow);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- avoids SSR/client time mismatch
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const svc = analyticsService(browserApi());
      const w = analyticsWindow;
      const [status, solved, byDept, byTech, byCat, ftf] = await Promise.all([
        svc.status(),
        svc.solved(w),
        svc.byDepartment(w),
        svc.byTechnician(w),
        svc.byCategory(w),
        svc.firstTimeFix(w),
      ]);
      setData({ status, solved, byDept, byTech, byCat, ftf });
      setLoadError(null);
    } catch (e) {
      // SURFACE it. This used to swallow the error and render zeros, which made a total
      // failure (CORS blocking every call, a 500 from one endpoint) look identical to "there
      // is no data for this period" — the single reason the dashboard stayed mysteriously
      // blank instead of saying what was wrong.
      setData(EMPTY);
      setLoadError(e instanceof Error ? e.message : "Could not reach the analytics API.");
    } finally {
      setRefreshing(false);
    }
  }, [analyticsWindow]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch on mount / period change
    void load();
  }, [load]);

  const stat = (n: number | undefined) => (data ? String(n ?? 0) : "—");
  const ftfPct = data ? `${Math.round(data.ftf.rate * 100)}%` : "—";

  const formattedTime = currentTime
    ? currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
    : "";
  const formattedDate = currentTime
    ? currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <div className="space-y-6 w-full px-4 md:px-8 py-6">
      {/* ── Greeting Banner ──────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white rounded-full translate-y-1/2" />
        </div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                IT Administrator Portal
              </span>
              <span className="text-xs font-semibold text-slate-400">System Management Console</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">System Status: Optimal</h1>
            <p className="text-sm text-slate-300 mt-1 font-medium">
              Overseeing 11FTC infrastructure &amp; synchronization systems • {formattedDate}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight">{formattedTime}</div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{formattedDate}</p>
          </div>
        </div>
      </div>

      {/* ── Range + Granularity + Actions Row ────────────
          Two independent controls: WHICH tickets (range) and HOW they're bucketed
          (granularity). Changing the range moves granularity to whatever reads best for that
          span, but the user can then override it. */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => {
                  setRange(r.key);
                  setGranularity(r.defaultGranularity);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                  range === r.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {GRANULARITIES.map((g) => (
              <button
                key={g.key}
                onClick={() => setGranularity(g.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                  granularity === g.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <button
            onClick={() => void load()}
            disabled={refreshing}
            className="btn-outline py-2 px-3.5 flex items-center gap-1.5 shadow-sm text-xs font-bold bg-white"
          >
            <svg className={`w-4 h-4 text-gray-500 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H17.77" />
            </svg>
            Refresh
          </button>
        </div>
      </div>


      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Analytics could not be loaded: {loadError}
        </div>
      )}
      {/* ── Stat Cards (live, M9 /analytics/status + first-time-fix) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Open Tickets" value={stat(data?.status.open)} badge="Awaiting" badgeColor="bg-blue-50 text-blue-700 border border-blue-200" iconBg="bg-blue-50"
          icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>} />
        <StatCard title="Ongoing" value={stat(data?.status.ongoing)} badge="Active Queue" badgeColor="bg-amber-50 text-amber-700 border border-amber-200" iconBg="bg-amber-50"
          icon={<svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="Resolved (Closed)" value={stat(data?.status.closed)} badge="Support Ops" badgeColor="bg-teal-50 text-teal-700 border border-teal-200" iconBg="bg-teal-50"
          icon={<svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="Total Tickets" value={stat(data?.status.total)} badge="All Time" badgeColor="bg-gray-50 text-gray-700 border border-gray-200" iconBg="bg-slate-50"
          icon={<svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <StatCard title="First-Time Fix" value={ftfPct} badge="FR-23" badgeColor="bg-green-50 text-green-700 border border-green-200" iconBg="bg-green-50"
          icon={<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>} />
      </div>

      {/* ── Charts Row ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2 space-y-4">
          <ResolutionTrendChart
            data={data?.solved}
            granularity={granularity}
            emptyHint={`No tickets were closed ${windowLabel}.`}
          />
        </div>
        <div className="card p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">By Department</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Administrative ticket distribution (FR-18)</p>
          </div>
          <ByDepartmentChart data={data?.byDept} />
        </div>
      </div>

      {/* ── Bottom Section ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Main Issue Categories</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Top issues count and percentage (FR-20)</p>
          </div>
          <TopIssuesChart data={data?.byCat} />
        </div>

        <div className="card p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">By Technician</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Tickets handled per person (FR-19)
            </p>
          </div>
          <ByTechnicianChart
            data={data?.byTech}
            emptyHint={`No tickets were handled ${windowLabel}.`}
          />
        </div>
      </div>
    </div>
  );
}

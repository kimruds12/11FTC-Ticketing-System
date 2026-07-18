"use client";

import { useState } from "react";

const MOCK_LOGS = [
  {
    id: "1",
    timestamp: "2025-10-27 14:52:45 UTC",
    user: "admin.system",
    userInitial: "AS",
    userColor: "bg-blue-600",
    action: "Login",
    device: "MacBook Pro / Chrome",
    ip: "192.168.1.10",
    result: "Success",
    resultType: "success",
    icon: null,
  },
  {
    id: "2",
    timestamp: "2025-10-27 14:35:22 UTC",
    user: "jdoe.support",
    userInitial: "JD",
    userColor: "bg-green-600",
    action: "Login",
    device: "ThinkPad / Firefox",
    ip: "10.0.0.42",
    result: "Failed (Bad Password)",
    resultType: "failed",
    icon: null,
  },
  {
    id: "3",
    timestamp: "2025-10-27 14:35:18 UTC",
    user: "jdoe.support",
    userInitial: "JD",
    userColor: "bg-green-600",
    action: "Login",
    device: "Unknown Device / API",
    ip: "45.22.18.101 (sec 4)",
    result: "Failed (Account Locked)",
    resultType: "locked",
    icon: "warning",
  },
  {
    id: "4",
    timestamp: "2025-10-27 13:50:05 UTC",
    user: "a.miller.ops",
    userInitial: "AM",
    userColor: "bg-purple-600",
    action: "Logout",
    device: "Dell XPS / Edge",
    ip: "192.164.1.51",
    result: "Success",
    resultType: "success",
    icon: null,
  },
];

const ACTION_OPTIONS = ["All Actions", "Login", "Logout", "Failed Login"];
const RESULT_OPTIONS = ["All Results", "Success", "Failed", "Locked"];
const TIMERANGE_OPTIONS = ["Last 24 Hours", "Last 7 Days", "Last 30 Days", "Custom"];

function ResultBadge({ result, type }: { result: string; type: string }) {
  const map: Record<string, string> = {
    success: "bg-green-50 text-green-700 border border-green-200",
    failed: "bg-red-50 text-red-700 border border-red-200",
    locked: "bg-red-100 text-red-800 border border-red-300",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${map[type] ?? "bg-gray-100 text-gray-600"}`}>
      {result}
    </span>
  );
}

export default function AccessActivityPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("All Actions");
  const [result, setResult] = useState("All Results");
  const [timeRange, setTimeRange] = useState("Last 24 Hours");

  const filtered = MOCK_LOGS.filter((log) => {
    const matchSearch =
      !search ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.ip.includes(search);
    const matchAction = action === "All Actions" || log.action === action;
    const matchResult =
      result === "All Results" ||
      (result === "Success" && log.resultType === "success") ||
      (result === "Failed" && log.resultType === "failed") ||
      (result === "Locked" && log.resultType === "locked");
    return matchSearch && matchAction && matchResult;
  });

  return (
    <div className="space-y-5 max-w-[1100px]">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Activity</h1>
          <p className="text-sm text-primary-700 mt-0.5">
            Real-time monitoring of user authentications and system access attempts.
          </p>
        </div>
        <button className="btn-outline">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Log
        </button>
      </div>

      {/* ── Filter bar ──────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Search Users / IPs</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. jdoe or 192.168.1"
                className="input pl-9"
              />
            </div>
          </div>
          {/* Action */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="input w-40">
              {ACTION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          {/* Result */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Result</label>
            <select value={result} onChange={(e) => setResult(e.target.value)} className="input w-40">
              {RESULT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          {/* Time Range */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Time Range</label>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="input w-40">
              {TIMERANGE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          {/* Filter CTA */}
          <button className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filter
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead className="bg-gray-50">
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Device / IP</th>
                <th>Result</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400 text-sm">
                    No entries match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="font-mono text-xs text-gray-500">{log.timestamp}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${log.userColor} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                          {log.userInitial}
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{log.user}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d={log.action === "Login"
                              ? "M11 16l-4-4m0 0l4-4m-4 4h14"
                              : "M17 16l4-4m0 0l-4-4m4 4H7"} />
                        </svg>
                        {log.action}
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-sm text-gray-700">{log.device}</p>
                        <p className="text-xs text-gray-400 font-mono">{log.ip}</p>
                      </div>
                    </td>
                    <td>
                      <ResultBadge result={log.result} type={log.resultType} />
                    </td>
                    <td>
                      {log.icon === "warning" && (
                        <button className="p-1 text-amber-500 hover:text-amber-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">Showing 1 to 25 of 1,248 entries</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className={`w-8 h-8 flex items-center justify-center rounded border text-sm ${
                  p === 1
                    ? "border-primary-700 bg-primary-700 text-white font-semibold"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
            <span className="px-1 text-gray-400">…</span>
            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

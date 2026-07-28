"use client";

import { useState } from "react";

/**
 * System Audit Logs Page
 *
 * Per SRS §7, FR-33–35, M6:
 *  - One entry per changed field (FR-33)
 *  - Captures previous value, new value, acting user, timestamp
 *  - Immutable — no edit or delete (FR-35)
 *  - Actions: CREATE, UPDATE, ASSIGN, STATUS_CHANGE, CLOSE
 *
 * IT Staff: can view ticket history (SRS §3.2)
 */

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: "CREATE" | "UPDATE" | "ASSIGN" | "STATUS_CHANGE" | "CLOSE";
  target: string;
  details: string;
}

const mockAuditLogs: AuditLogEntry[] = [];

const actionStyles: Record<string, string> = {
  CREATE: "bg-green-50 text-green-700 border-green-200",
  UPDATE: "bg-blue-50 text-blue-700 border-blue-200",
  ASSIGN: "bg-purple-50 text-purple-700 border-purple-200",
  STATUS_CHANGE: "bg-amber-50 text-amber-700 border-amber-200",
  CLOSE: "bg-red-50 text-red-700 border-red-200",
};

export default function AuditLogsPage() {
  const [dateRange, setDateRange] = useState("7d");
  const [userSearch, setUserSearch] = useState("");
  const [actionType, setActionType] = useState("all");
  const [targetSearch, setTargetSearch] = useState("");

  const filteredLogs = mockAuditLogs.filter((log) => {
    const matchesUser =
      !userSearch || log.user.toLowerCase().includes(userSearch.toLowerCase());
    const matchesAction =
      actionType === "all" || log.action === actionType;
    const matchesTarget =
      !targetSearch || log.target.toLowerCase().includes(targetSearch.toLowerCase());

    return matchesUser && matchesAction && matchesTarget;
  });

  return (
    <div className="space-y-6 w-full px-4 md:px-8 py-6">
      {/* ── Page Header ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">System Audit Logs</h1>
          <p className="page-subtitle">Read-only view of staff actions and ticket operations.</p>
        </div>
        <button className="btn-outline self-start sm:self-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* ── Filter Toolbar ───────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center bg-white p-4 rounded-xl border border-gray-200 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
          {/* Date Range */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-select text-sm"
              aria-label="Filter by date range"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          {/* Admin / User */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Admin / User</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or ID"
                className="input pl-8 text-sm"
                aria-label="Search by user"
              />
            </div>
          </div>

          {/* Action Type */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Action Type</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="input-select text-sm"
              aria-label="Filter by action type"
            >
              <option value="all">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="ASSIGN">Assign</option>
              <option value="STATUS_CHANGE">Status Change</option>
              <option value="CLOSE">Close</option>
            </select>
          </div>

          {/* Ticket ID */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Ticket ID</label>
            <input
              type="text"
              value={targetSearch}
              onChange={(e) => setTargetSearch(e.target.value)}
              placeholder="e.g. IT-2026-0192"
              className="input text-sm"
              aria-label="Search by target ticket ID"
            />
          </div>
        </div>

        <button className="btn-primary py-2.5 px-5 text-sm font-bold whitespace-nowrap self-end xl:self-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search Logs
        </button>
      </div>

      {/* ── Audit Logs Table ─────────────────────── */}
      <div className="w-full overflow-hidden bg-white rounded-xl border border-gray-200 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="bg-primary-50/50 border-b border-primary-100">
                <th className="px-5 py-3.5 text-xs font-bold text-primary-800 uppercase tracking-wider">
                  Date/Time (UTC)
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-primary-800 uppercase tracking-wider">
                  User
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-primary-800 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-primary-800 uppercase tracking-wider">
                  Ticket ID
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-primary-800 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 font-medium tabular-nums">
                      {log.timestamp}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {log.user}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${actionStyles[log.action] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-primary-700">
                      {log.target}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 font-medium max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-sm text-gray-400 font-medium">No audit log entries found matching criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-5 py-3.5 border-t border-gray-100 text-xs font-semibold text-gray-400 gap-3">
          <span>Showing 0-0 of 0 events</span>
          <div className="flex items-center gap-1">
            <button className="p-1.5 px-2.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors text-gray-500" disabled>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="p-1.5 px-3 rounded-md border border-gray-200 bg-white text-gray-400 font-medium text-xs" disabled>1</button>
            <button className="p-1.5 px-2.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500" disabled>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

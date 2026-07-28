"use client";

import { useState } from "react";

interface AccessLog {
  id: string;
  timestamp: string;
  user: string;
  userInitials: string;
  userColor: string;
  action: string;
  device: string;
  ip: string;
  result: string;
  resultType: "success" | "failed" | "locked";
  hasAlert?: boolean;
}

const initialLogs: AccessLog[] = [
  {
    id: "log-1",
    timestamp: "2023-10-27 14:32:45 UTC",
    user: "admin.system",
    userInitials: "AD",
    userColor: "bg-red-600",
    action: "Login",
    device: "MacBook Pro / Chrome",
    ip: "192.168.1.105",
    result: "Success",
    resultType: "success",
  },
  {
    id: "log-2",
    timestamp: "2023-10-27 14:15:22 UTC",
    user: "jdoe.support",
    userInitials: "JD",
    userColor: "bg-blue-600",
    action: "Login",
    device: "ThinkPad / Firefox",
    ip: "10.0.0.42",
    result: "Failed (Bad Password)",
    resultType: "failed",
  },
  {
    id: "log-3",
    timestamp: "2023-10-27 14:15:18 UTC",
    user: "jdoe.support",
    userInitials: "JD",
    userColor: "bg-blue-600",
    action: "Login",
    device: "Unknown Device / API",
    ip: "45.22.19.182 (Geo: RU)",
    result: "Failed (Account Locked)",
    resultType: "locked",
    hasAlert: true,
  },
  {
    id: "log-4",
    timestamp: "2023-10-27 13:50:05 UTC",
    user: "s.miller.ops",
    userInitials: "SM",
    userColor: "bg-teal-600",
    action: "Logout",
    device: "Dell XPS / Edge",
    ip: "192.168.1.55",
    result: "Success",
    resultType: "success",
  },
];

export default function AccessActivityPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("24h");

  const filteredLogs = initialLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.ip.toLowerCase().includes(search.toLowerCase()) ||
      log.device.toLowerCase().includes(search.toLowerCase());

    const matchesAction =
      actionFilter === "all" || log.action.toLowerCase() === actionFilter.toLowerCase();

    const matchesResult =
      resultFilter === "all" ||
      (resultFilter === "success" && log.resultType === "success") ||
      (resultFilter === "failed" && log.resultType === "failed") ||
      (resultFilter === "locked" && log.resultType === "locked");

    return matchesSearch && matchesAction && matchesResult;
  });

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1400px] mx-auto">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Access Activity</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">Real-time monitoring of user authentications and system access attempts.</p>
        </div>
        <button className="btn-outline self-start sm:self-auto flex items-center gap-2 shadow-sm font-bold text-xs">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Log
        </button>
      </div>

      {/* ── Filter Toolbar ──────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center bg-white p-4 rounded-xl border border-gray-200 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {/* Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. jdoe or 192.168.1"
              className="input pl-9"
            />
          </div>

          {/* Action Select */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input bg-gray-50 cursor-pointer font-semibold text-gray-700"
          >
            <option value="all">All Actions</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>

          {/* Result Select */}
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="input bg-gray-50 cursor-pointer font-semibold text-gray-700"
          >
            <option value="all">All Results</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="locked">Locked</option>
          </select>

          {/* Time Range Select */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="input bg-gray-50 cursor-pointer font-semibold text-gray-700"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        <button className="btn-primary flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter
        </button>
      </div>

      {/* ── Log Table ───────────────────────────────────────── */}
      <div className="w-full overflow-hidden bg-white rounded-xl border border-gray-200 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Device / IP
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Timestamp */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {log.timestamp}
                    </td>

                    {/* User */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${log.userColor}`}>
                          {log.userInitials}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{log.user}</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {log.action}
                    </td>

                    {/* Device / IP */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-800 font-medium">{log.device}</div>
                        <div className="text-xs text-gray-400 font-semibold mt-0.5">{log.ip}</div>
                      </div>
                    </td>

                    {/* Result */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold ${log.resultType === "success"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : log.resultType === "failed"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-red-100 text-red-800 border border-red-300"
                          }`}>
                          {log.result}
                        </span>
                        {log.hasAlert && (
                          <svg className="w-4 h-4 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                      </div>
                    </td>

                    {/* Details */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-xs font-bold text-primary-700 hover:text-primary-800 hover:underline">
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400 font-medium">
                    No access log entries found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 text-xs font-semibold text-gray-400">
          <span>Showing 1 to {filteredLogs.length} of 1,248 entries</span>
          <div className="flex gap-2">
            <button className="p-1 px-2.5 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50" disabled>
              &lt;
            </button>
            <button className="p-1 px-2.5 rounded border border-gray-200 bg-red-700 text-white font-bold">
              1
            </button>
            <button className="p-1 px-2.5 rounded border border-gray-200 bg-white hover:bg-gray-50">
              2
            </button>
            <button className="p-1 px-2.5 rounded border border-gray-200 bg-white hover:bg-gray-50">
              3
            </button>
            <button className="p-1 px-2.5 rounded border border-gray-200 bg-white hover:bg-gray-50">
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

const MOCK_AUDIT = [
  { id: "1", ticketId: "INC-8842", action: "STATUS_CHANGE", field: "status", prev: "Open", next: "Ongoing", actor: "Admin User", ts: "Oct 24, 2026 10:14" },
  { id: "2", ticketId: "INC-8842", action: "UPDATE", field: "remarks", prev: null, next: "Escalated to L2 team.", actor: "Admin User", ts: "Oct 24, 2026 09:58" },
  { id: "3", ticketId: "INC-8841", action: "CLOSE", field: "status", prev: "Ongoing", next: "Closed", actor: "Alice M.", ts: "Oct 24, 2026 09:45" },
  { id: "4", ticketId: "INC-8841", action: "ASSIGN", field: "assigned_to", prev: "Unassigned", next: "Alice M.", actor: "Admin User", ts: "Oct 24, 2026 09:12" },
  { id: "5", ticketId: "INC-8840", action: "CREATE", field: "ticket", prev: null, next: "INC-8840", actor: "Tom B.", ts: "Oct 23, 2026 16:30" },
];

const ACTION_COLORS: Record<string, string> = {
  CREATE:        "bg-blue-50 text-blue-700 border-blue-200",
  UPDATE:        "bg-amber-50 text-amber-700 border-amber-200",
  STATUS_CHANGE: "bg-purple-50 text-purple-700 border-purple-200",
  ASSIGN:        "bg-teal-50 text-teal-700 border-teal-200",
  CLOSE:         "bg-green-50 text-green-700 border-green-200",
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_AUDIT.filter(
    (e) =>
      !search ||
      e.ticketId.toLowerCase().includes(search.toLowerCase()) ||
      e.actor.toLowerCase().includes(search.toLowerCase()) ||
      e.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-[1100px]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Immutable record of all ticket changes. One entry per changed field.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket, actor, or action…"
            className="input pl-9"
          />
        </div>
        <button className="btn-outline">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead className="bg-gray-50">
              <tr>
                <th>Ticket ID</th>
                <th>Action</th>
                <th>Field</th>
                <th>Previous Value</th>
                <th>New Value</th>
                <th>Actor</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                    No audit entries found.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td>
                      <span className="font-mono text-xs font-semibold text-primary-700">{entry.ticketId}</span>
                    </td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${ACTION_COLORS[entry.action] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600 font-medium">{entry.field}</td>
                    <td className="text-sm text-gray-400 italic">{entry.prev ?? "—"}</td>
                    <td className="text-sm text-gray-700 font-medium">{entry.next ?? "—"}</td>
                    <td className="text-sm text-gray-700">{entry.actor}</td>
                    <td className="text-xs text-gray-400 whitespace-nowrap">{entry.ts}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            Audit entries are <span className="font-semibold text-gray-600">immutable</span> — no entry can be edited or deleted (FR-35).
          </p>
          <span className="text-sm text-gray-500">Showing {filtered.length} entries</span>
        </div>
      </div>
    </div>
  );
}

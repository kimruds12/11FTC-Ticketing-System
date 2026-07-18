"use client";

import { useState } from "react";
import Link from "next/link";

/* ── Mock data ────────────────────────────────────────────── */
const MOCK_TICKETS = [
  {
    id: "INC-8842",
    date: "Oct 24, 09:12",
    employee: "Sarah Jenkins",
    department: "Finance",
    mainIssue: "VPN Connection Failing Post Update",
    status: "OPEN",
    assignedTo: "John Doe",
    assignedInitials: "JD",
  },
  {
    id: "INC-8841",
    date: "Oct 24, 08:45",
    employee: "Marcus Chen",
    department: "Engineering",
    mainIssue: "Request for new IDE License (JetBrains)",
    status: "ONGOING",
    assignedTo: "Alice M.",
    assignedInitials: "AM",
  },
  {
    id: "INC-8837",
    date: "Oct 23, 16:30",
    employee: "Elena Rodriguez",
    department: "Marketing",
    mainIssue: "Printer on 3rd floor out of toner",
    status: "CLOSED",
    assignedTo: "Tom B.",
    assignedInitials: "TB",
  },
  {
    id: "INC-8836",
    date: "Oct 23, 14:15",
    employee: "David Kim",
    department: "Sales",
    mainIssue: "CRM Dashboard loading extremely slowly",
    status: "OPEN",
    assignedTo: null,
    assignedInitials: null,
  },
];

const STATUS_OPTIONS = ["All", "OPEN", "ONGOING", "CLOSED"];
const PRIORITY_OPTIONS = ["All", "High", "Medium", "Low"];
const DEPT_OPTIONS = ["All", "Finance", "Engineering", "Marketing", "Sales", "Infrastructure"];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "bg-blue-50 text-blue-700 border border-blue-200",
    ONGOING: "bg-amber-50 text-amber-700 border border-amber-200",
    CLOSED: "bg-green-50 text-green-700 border border-green-200",
    PENDING: "bg-purple-50 text-purple-700 border border-purple-200",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function TicketsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");

  const filtered = MOCK_TICKETS.filter((t) => {
    const matchSearch =
      !search ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.employee.toLowerCase().includes(search.toLowerCase()) ||
      t.mainIssue.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    const matchDept = deptFilter === "All" || t.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* ── Filters bar ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by ID, Employee, or Issue…"
            className="input pl-9 text-sm"
          />
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input w-auto px-3 py-2 text-sm"
          >
            {PRIORITY_OPTIONS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>

        {/* Department */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">Department:</span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="input w-auto px-3 py-2 text-sm"
          >
            {DEPT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div className="ml-auto">
          <Link href="/tickets/new" className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Ticket
          </Link>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead className="bg-gray-50">
              <tr>
                <th>Ticket ID</th>
                <th>Date</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Main Issue</th>
                <th>Status</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                    No tickets match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td>
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="font-semibold text-primary-700 hover:underline text-xs leading-tight block"
                      >
                        {ticket.id}
                      </Link>
                    </td>
                    <td className="text-gray-500 text-xs">{ticket.date}</td>
                    <td>
                      <span className="font-medium text-primary-700 hover:underline cursor-pointer text-sm">
                        {ticket.employee}
                      </span>
                    </td>
                    <td>
                      <span className="text-primary-700 text-sm font-medium">{ticket.department}</span>
                    </td>
                    <td className="max-w-[240px]">
                      <span
                        className={`text-sm ${ticket.status === "CLOSED" ? "line-through text-gray-400" : "text-gray-700"}`}
                      >
                        {ticket.mainIssue}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td>
                      {ticket.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {ticket.assignedInitials}
                          </span>
                          <span className="text-sm text-gray-700">{ticket.assignedTo}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
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
          <span className="text-sm text-gray-500">
            Showing 1 to {filtered.length} of 128 tickets
          </span>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40" disabled>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded border border-primary-700 bg-primary-700 text-white text-sm font-semibold">
              1
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">
              2
            </button>
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

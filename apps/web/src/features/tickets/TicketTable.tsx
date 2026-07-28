"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";

/**
 * TicketTable — Ticket queue data table.
 *
 * Per FR-3 and queue.md, columns:
 *   Ticket ID, Date, Employee, Department, Main Issue, Status, Assigned To, Actions
 *
 * No priority column — SRS §11 defers SLA/priority.
 * Newest-first ordering (matches API per queue.md).
 */

export interface Ticket {
  id: string;
  date: string;
  employee: string;
  employeeEmail?: string;
  department: string;
  mainIssue: string;
  status: string;
  assignedTo: string;
  assignedInitials?: string;
}

interface TicketTableProps {
  tickets: Ticket[];
}

export default function TicketTable({ tickets }: TicketTableProps) {
  return (
    <div className="w-full overflow-hidden bg-white rounded-xl border border-gray-200 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Ticket ID
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Dept
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Main Issue
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Ticket ID */}
                  <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="hover:text-primary-700 hover:underline transition-colors"
                    >
                      {ticket.id}
                    </Link>
                  </td>

                  {/* Date */}
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                    {ticket.date}
                  </td>

                  {/* Employee */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] flex items-center justify-center border border-blue-100 flex-shrink-0">
                        {ticket.employee.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <span className="text-sm font-semibold text-gray-900 block">{ticket.employee}</span>
                        {ticket.employeeEmail && (
                          <span className="text-[10px] text-gray-400 font-medium">{ticket.employeeEmail}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {ticket.department}
                  </td>

                  {/* Main Issue */}
                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    <span className="inline-flex px-2 py-0.5 rounded bg-gray-50 border border-gray-200 text-xs font-bold text-gray-600">
                      {ticket.mainIssue}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    <StatusBadge status={ticket.status} />
                  </td>

                  {/* Assigned To */}
                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    {ticket.assignedTo === "Unassigned" ? (
                      <span className="text-gray-400 italic text-xs">Unassigned</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {ticket.assignedInitials && (
                          <span className="w-6 h-6 rounded-full bg-primary-50 text-primary-700 font-bold text-[10px] flex items-center justify-center border border-primary-100 flex-shrink-0">
                            {ticket.assignedInitials}
                          </span>
                        )}
                        <span className="text-gray-900 font-medium text-xs">{ticket.assignedTo}</span>
                      </div>
                    )}
                  </td>

                  {/* Actions (View, Edit, Delete) */}
                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2.5">
                      {/* View */}
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="View details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>

                      {/* Edit */}
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit ticket"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>

                      {/* Delete */}
                      <button
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete ticket"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm text-gray-400 font-medium">No tickets found matching the search criteria.</p>
                    <Link href="/tickets/new" className="text-xs font-bold text-primary-700 hover:text-primary-800 hover:underline mt-1">
                      Create a new ticket →
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Table Footer / Pagination ──────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-center px-5 py-3.5 border-t border-gray-100 text-xs font-semibold text-gray-400 gap-3">
        <span>Showing 1 to {tickets.length} of {tickets.length} tickets</span>
        <div className="flex items-center gap-1.5">
          <button
            className="p-1.5 px-2.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors text-gray-500"
            disabled
            aria-label="Previous page"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="p-1.5 px-2.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500"
            aria-label="Next page"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { formatAssignees, type TicketDto } from "@11ftc/shared";
import { formatSheetDate } from "@/lib/utils";
import StatusBadge from "./StatusBadge";

/**
 * TicketTable — the ticket queue (FR-3). Renders the M5 read model (`TicketDto`) directly;
 * no view-model fork.
 *
 * Columns: Ticket No, Date, Employee, Department, Main Issue, Status, Assigned To, Actions.
 * No priority column — SRS §11 defers SLA/priority.
 *
 * There is NO delete action. Nothing is ever deleted (FR-9/FR-35); corrections are edits and
 * the audit log carries them. Do not add one.
 */

interface TicketTableProps {
  tickets: TicketDto[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (nextOffset: number) => void;
}

function initialsOf(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export default function TicketTable({
  tickets,
  total,
  limit,
  offset,
  onPageChange,
}: TicketTableProps) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + tickets.length, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <div className="w-full overflow-hidden bg-white rounded-xl border border-gray-200 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {["Ticket No", "Date", "Employee", "Dept", "Main Issue", "Status", "Assigned To", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <tr key={ticket.ticketId} className="hover:bg-gray-50/50 transition-colors">
                  {/* Ticket No — the human identifier (M3), persisted once. */}
                  <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                    <Link
                      href={`/tickets/${ticket.ticketId}`}
                      className="hover:text-primary-700 hover:underline transition-colors"
                    >
                      {ticket.ticketNo}
                    </Link>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                    {formatSheetDate(ticket.date)}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] flex items-center justify-center border border-blue-100 flex-shrink-0">
                        {initialsOf(ticket.employeeName)}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {ticket.employeeName ?? "—"}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {ticket.department ?? "—"}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    <span className="inline-flex px-2 py-0.5 rounded bg-gray-50 border border-gray-200 text-xs font-bold text-gray-600">
                      {ticket.mainIssue ?? "—"}
                    </span>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    <StatusBadge status={ticket.status} />
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    {/* One avatar per technician — a ticket can have several (ADR-0017). */}
                    {ticket.assignees.length ? (
                      <div className="flex items-center gap-2">
                        <span className="flex -space-x-1.5 flex-shrink-0">
                          {ticket.assignees.map((a) => (
                            <span
                              key={a.technicianId}
                              title={a.name}
                              className="w-6 h-6 rounded-full bg-primary-50 text-primary-700 font-bold text-[10px] flex items-center justify-center border border-primary-100 ring-1 ring-white"
                            >
                              {initialsOf(a.name)}
                            </span>
                          ))}
                        </span>
                        <span className="text-gray-900 font-medium text-xs">
                          {formatAssignees(ticket.assignees)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Unassigned</span>
                    )}
                  </td>

                  {/* Actions — view/edit only. No delete (FR-9/FR-35). */}
                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/tickets/${ticket.ticketId}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:text-primary-800 hover:underline transition-colors"
                    >
                      View
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
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
                    <p className="text-sm text-gray-400 font-medium">
                      No tickets found matching the search criteria.
                    </p>
                    <Link
                      href="/tickets/new"
                      className="text-xs font-bold text-primary-700 hover:text-primary-800 hover:underline mt-1"
                    >
                      Encode a new ticket →
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination (server-side via limit/offset) ── */}
      <div className="flex flex-col sm:flex-row justify-between items-center px-5 py-3.5 border-t border-gray-100 text-xs font-semibold text-gray-400 gap-3">
        <span>
          Showing {from} to {to} of {total} tickets
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(Math.max(0, offset - limit))}
            disabled={!hasPrev}
            className="p-1.5 px-2.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-500"
            aria-label="Previous page"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => onPageChange(offset + limit)}
            disabled={!hasNext}
            className="p-1.5 px-2.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-500"
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

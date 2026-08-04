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
  /** Open the encode modal from the empty state — encoding is not a route. */
  onEncode: () => void;
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
  onEncode,
}: TicketTableProps) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + tickets.length, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <div className="w-full overflow-hidden bg-white rounded-xl border border-gray-200 shadow-card">
      {/* ── Phone / tablet: one card per ticket ──────────────────────────────────────
          The table below needs 900px to stay honest, which on a 375px screen means dragging
          a data grid sideways to read one row — eight columns of which two matter. A card
          shows the same record in reading order at the width the device actually has.
          `lg` is the same boundary the sidebar uses, so the layout changes once, not twice. */}
      <div className="divide-y divide-gray-100 lg:hidden">
        {tickets.length > 0 ? (
          tickets.map((ticket) => (
            <Link
              key={ticket.ticketId}
              href={`/tickets/${ticket.ticketId}`}
              className="block px-4 py-3.5 transition-colors active:bg-gray-50 focus:outline-none focus-visible:bg-primary-50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-bold text-gray-900">{ticket.ticketNo}</span>
                <StatusBadge status={ticket.status} />
              </div>

              <div className="mt-2 flex items-center gap-2.5">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-[10px] font-bold text-blue-700">
                  {initialsOf(ticket.employeeName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">
                    {ticket.employeeName ?? "—"}
                  </span>
                  <span className="block truncate text-xs font-medium text-gray-500">
                    {ticket.department ?? "—"}
                  </span>
                </span>
              </div>

              {/* `min-w-0` + `truncate` on the issue: real concern labels are long and would
                  otherwise push the date off the card. */}
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-bold text-gray-600">
                  {ticket.mainIssue ?? "—"}
                </span>
                <span className="flex-shrink-0 text-xs font-medium tabular-nums text-gray-400">
                  {formatSheetDate(ticket.date)}
                </span>
              </div>

              <div className="mt-2 text-xs">
                {ticket.assignees.length ? (
                  <span className="font-medium text-gray-500">
                    Handled by{" "}
                    <span className="font-semibold text-gray-900">
                      {formatAssignees(ticket.assignees)}
                    </span>
                  </span>
                ) : (
                  <span className="italic text-gray-400">Unassigned</span>
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-400">
              No tickets found matching the search criteria.
            </p>
            <button
              type="button"
              onClick={onEncode}
              className="mt-1 text-xs font-bold text-primary-700 hover:underline"
            >
              Encode a new ticket →
            </button>
          </div>
        )}
      </div>

      {/* ── Desktop: the full eight-column record ── */}
      <div className="hidden overflow-x-auto lg:block">
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
                    <button
                      type="button"
                      onClick={onEncode}
                      className="text-xs font-bold text-primary-700 hover:text-primary-800 hover:underline mt-1"
                    >
                      Encode a new ticket →
                    </button>
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

import { useState } from "react";
import Link from "next/link";
import { formatAssignees, type TicketDto } from "@11ftc/shared";
import { formatSheetDate } from "@/lib/utils";
import StatusBadge from "./StatusBadge";

interface TicketTableProps {
  tickets: TicketDto[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (nextOffset: number) => void;
  onLimitChange: (nextLimit: number) => void;
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
  onLimitChange,
  onEncode,
}: TicketTableProps) {
  const [goToPage, setGoToPage] = useState("");

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  function handlePageJump(p: number) {
    if (p >= 1 && p <= totalPages) {
      onPageChange((p - 1) * limit);
    }
  }

  function handleGoToSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const p = parseInt(goToPage, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      handlePageJump(p);
      setGoToPage("");
    }
  }

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

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

      {/* ── Pagination matching Picture 2 (total in total, < [1] 2 >, dropdown 10/page, Go to) ── */}
      <div className="flex flex-wrap items-center justify-end gap-3 px-5 py-3.5 border-t border-gray-100 text-xs font-medium text-gray-500">
        <span className="text-gray-500 mr-1 tabular-nums">
          {total} in total
        </span>

        {/* Previous page < */}
        <button
          onClick={() => handlePageJump(currentPage - 1)}
          disabled={!hasPrev}
          className="min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1.5">
          {getPageNumbers().map((p, idx) =>
            typeof p === "number" ? (
              <button
                key={idx}
                onClick={() => handlePageJump(p)}
                className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded text-xs transition-colors ${
                  p === currentPage
                    ? "border border-blue-500 text-blue-600 bg-white font-bold shadow-xs"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 font-medium"
                }`}
              >
                {p}
              </button>
            ) : (
              <span
                key={idx}
                className="min-w-[24px] h-7 flex items-center justify-center text-gray-400 text-xs select-none"
              >
                {p}
              </span>
            ),
          )}
        </div>

        {/* Next page > */}
        <button
          onClick={() => handlePageJump(currentPage + 1)}
          disabled={!hasNext}
          className="min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Page size dropdown */}
        <div className="relative inline-block ml-1">
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="h-7 pl-2.5 pr-6 bg-white border border-gray-200 hover:border-gray-300 rounded text-xs text-gray-700 font-medium appearance-none cursor-pointer focus:outline-none focus:border-blue-500 shadow-xs"
            aria-label="Items per page"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <svg
            className="w-3.5 h-3.5 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Go to [input] */}
        <form onSubmit={handleGoToSubmit} className="flex items-center gap-1.5 ml-1">
          <span className="text-gray-500 text-xs font-medium">Go to</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={goToPage}
            onChange={(e) => setGoToPage(e.target.value)}
            onBlur={() => handleGoToSubmit()}
            className="w-11 h-7 px-1.5 border border-gray-200 rounded text-center text-xs text-gray-800 focus:outline-none focus:border-blue-500 bg-white"
            aria-label="Go to page"
          />
        </form>
      </div>
    </div>
  );
}

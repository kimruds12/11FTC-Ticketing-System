import Link from "next/link";
import type { MainIssueDto, TicketDetailDto } from "@11ftc/shared";
import { serverApi } from "@/services/server";
import { ticketsService } from "@/services/tickets.service";
import { lookupsService } from "@/services/lookups.service";
import { AppError } from "@/services/errors";
import TicketDetailClient from "@/features/tickets/TicketDetailClient";

/**
 * Ticket detail (M5 + M6). Server-fetches the ticket with its audit trail; the client shell
 * owns the lifecycle buttons. `/tickets/:id` returns `history` already, so the audit trail
 * needs no second request.
 */
export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const api = serverApi();

  let ticket: TicketDetailDto;
  try {
    ticket = await ticketsService(api).getById(ticketId);
  } catch (error) {
    const message =
      error instanceof AppError && error.status === 404
        ? "That ticket does not exist."
        : error instanceof AppError
          ? error.message
          : "The API is unreachable.";
    return (
      <div className="max-w-[900px] mx-auto px-4 md:px-8 py-10 space-y-4">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Ticket Queue
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Could not load this ticket: {message}
        </div>
      </div>
    );
  }

  // Lookups for the correction form. Technicians aren't fetched here — the picker searches
  // `/technicians` itself, which every authenticated role may call (ADR-0017).
  const mainIssues = await lookupsService(api)
    .listMainIssues()
    .catch((): MainIssueDto[] => []);

  return (
    <TicketDetailClient
      ticket={ticket}
      mainIssues={mainIssues.filter((mi) => mi.isActive)}
    />
  );
}

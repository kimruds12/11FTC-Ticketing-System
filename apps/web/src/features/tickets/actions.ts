"use server";
import { revalidatePath } from "next/cache";
import { serverApi } from "@/services/server";
import { ticketsService } from "@/services/tickets.service";
import { AppError } from "@/services/errors";
import type {
  AssignTicketDto,
  BulkEncodeTicketDto,
  CloseTicketDto,
  EncodeTicketDto,
  TicketDto,
  UpdateTicketDto,
} from "@11ftc/shared";

/**
 * Server Actions for tickets — the mutation door for forms (architecture.md, pattern 2).
 * They TRIGGER the api services and revalidate; they carry NO business logic. The API (M5)
 * enforces the state machine, numbering, audit, and outbox in one transaction; these actions
 * just shape the call and refresh the affected routes.
 *
 * A 409 from the API means the state machine refused the transition (e.g. anything out of
 * Closed, which is terminal per FR-8). That surfaces as `error` here, not as a thrown page.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

function fail(error: unknown): { ok: false; error: string; status: number } {
  if (error instanceof AppError) {
    return { ok: false, error: error.message, status: error.status };
  }
  return { ok: false, error: "Unexpected error", status: 0 };
}

/** Refresh both the queue and the ticket's own page after a mutation. */
function revalidateTicket(id?: string) {
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/tickets/${id}`);
}

export async function encodeTicketAction(
  payload: EncodeTicketDto,
): Promise<ActionResult<TicketDto>> {
  try {
    const ticket = await ticketsService(serverApi()).encode(payload);
    revalidateTicket(ticket.ticketId);
    return { ok: true, data: ticket };
  } catch (error) {
    return fail(error);
  }
}

/** FR-39 — one round trip, one transaction. A rejected row fails the batch, nothing is written. */
export async function bulkEncodeTicketAction(
  payload: BulkEncodeTicketDto,
): Promise<ActionResult<TicketDto[]>> {
  try {
    const tickets = await ticketsService(serverApi()).encodeBulk(payload);
    revalidateTicket();
    return { ok: true, data: tickets };
  } catch (error) {
    return fail(error);
  }
}

export async function updateTicketAction(
  id: string,
  payload: UpdateTicketDto,
): Promise<ActionResult<TicketDto>> {
  try {
    const ticket = await ticketsService(serverApi()).update(id, payload);
    revalidateTicket(id);
    return { ok: true, data: ticket };
  } catch (error) {
    return fail(error);
  }
}

export async function assignTicketAction(
  id: string,
  payload: AssignTicketDto,
): Promise<ActionResult<TicketDto>> {
  try {
    const ticket = await ticketsService(serverApi()).assign(id, payload);
    revalidateTicket(id);
    return { ok: true, data: ticket };
  } catch (error) {
    return fail(error);
  }
}

export async function markOngoingAction(id: string): Promise<ActionResult<TicketDto>> {
  try {
    const ticket = await ticketsService(serverApi()).markOngoing(id);
    revalidateTicket(id);
    return { ok: true, data: ticket };
  } catch (error) {
    return fail(error);
  }
}

export async function closeTicketAction(
  id: string,
  payload: CloseTicketDto = {},
): Promise<ActionResult<TicketDto>> {
  try {
    const ticket = await ticketsService(serverApi()).close(id, payload);
    revalidateTicket(id);
    return { ok: true, data: ticket };
  } catch (error) {
    return fail(error);
  }
}

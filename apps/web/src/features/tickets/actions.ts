"use server";
import { revalidatePath } from "next/cache";
import { serverApi } from "@/services/server";
import { ticketsService } from "@/services/tickets.service";
import { AppError } from "@/services/errors";
import type { TicketStatus } from "@11ftc/shared";

/**
 * Server Actions for tickets — the mutation door for forms (architecture.md, pattern 2).
 * They TRIGGER the api services and revalidate; they carry NO business logic. The API
 * (M5) enforces the state machine, numbering, audit, and outbox in one transaction; these
 * actions just shape the call and refresh the affected routes.
 *
 * Payloads are `unknown` until the M5 DTOs land in @11ftc/shared — do not fork the
 * write-contract into the frontend.
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

export async function encodeTicketAction(payload: unknown): Promise<ActionResult> {
  try {
    await ticketsService(serverApi()).encode(payload);
    revalidatePath("/tickets");
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function updateTicketAction(
  id: string,
  payload: unknown,
): Promise<ActionResult> {
  try {
    await ticketsService(serverApi()).update(id, payload);
    revalidatePath("/tickets");
    revalidatePath(`/tickets/${id}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function transitionTicketAction(
  id: string,
  next: TicketStatus,
): Promise<ActionResult> {
  try {
    await ticketsService(serverApi()).transition(id, next);
    revalidatePath("/tickets");
    revalidatePath(`/tickets/${id}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

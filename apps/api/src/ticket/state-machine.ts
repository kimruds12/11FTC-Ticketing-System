import { TicketStatus } from "@11ftc/shared";

/**
 * The ticket state machine (07-ticket-state-machine.d2), enforced SERVER-SIDE — never a UI
 * hint. Three statuses; Closed is terminal (FR-8). No reopen, no backward move, no no-op
 * self-transition. A client that posts an illegal transition is rejected here regardless of
 * what the form allowed.
 */
const ALLOWED: Record<TicketStatus, readonly TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.ONGOING, TicketStatus.CLOSED],
  [TicketStatus.ONGOING]: [TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: [], // terminal
};

export function canTransitionTo(current: TicketStatus, next: TicketStatus): boolean {
  return ALLOWED[current].includes(next);
}

import { Injectable } from "@nestjs/common";

/**
 * M5 — Ticket Encoding & Lifecycle. Empty service (scaffold). This is THE transaction
 * boundary for the whole system; nothing beneath it opens its own transaction. Dispatch
 * to BullMQ happens AFTER commit. See docs/implementation/M5-ticket.md.
 */
@Injectable()
export class TicketService {}

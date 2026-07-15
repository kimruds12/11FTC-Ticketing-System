import { Injectable } from "@nestjs/common";

/**
 * M3 — Ticket Numbering. Empty service (scaffold). The real contract:
 *   next(date, tx): { ticket_no, sequence_scope, sequence_number }
 * allocated inside the caller's transaction. See docs/implementation/M3-numbering.md.
 */
@Injectable()
export class NumberingService {}

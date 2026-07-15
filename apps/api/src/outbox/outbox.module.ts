import { Module } from "@nestjs/common";
import { OutboxService } from "./outbox.service.js";

/**
 * M7 — Sync Outbox (write side). enqueue(ticketId, payload, tx) writes a PENDING row in
 * the caller's transaction. row_key = ticket_no. The outbox is the durable record; BullMQ
 * is only a trigger. Scaffold only — see .claude/rules/sync-worker.md and
 * docs/implementation/M7-outbox.md.
 */
@Module({
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}

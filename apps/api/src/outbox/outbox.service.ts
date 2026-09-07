import { Injectable } from "@nestjs/common";
import { schema, type Tx } from "@11ftc/db";

/**
 * The denormalized sheet row — names + labels, NEVER IDs (denormalize only at the boundary,
 * FR-27). M5 computes this at enqueue time; M8 projects it onto the append-only `_raw` tab.
 */
export interface SheetRowPayload {
  ticketNo: string;
  date: string;
  status: string;
  employeeName: string;
  department: string;
  mainIssue: string;
  concern: string;
  assignedToName: string | null;
  remarks: string | null;
  ongoingAt: string | null;
  closedAt: string | null;
}

/**
 * M7 — Sync Outbox (write side). Writes a PENDING row in the CALLER'S transaction, so "the
 * ticket exists" and "the sheet owes an update" become atomically true together (FR-31).
 * `row_key = ticket_no` locates the sheet row by content, not position. BullMQ is only a
 * trigger; this durable row is the source of truth. See `.claude/rules/sync-worker.md`.
 */
@Injectable()
export class OutboxService {
  async enqueue(ticketId: string, payload: SheetRowPayload, tx: Tx): Promise<void> {
    await tx.insert(schema.syncOutbox).values({
      ticketId,
      operation: "UPSERT",
      rowKey: payload.ticketNo,
      payload,
      status: "PENDING",
      attempts: 0,
    });
  }
}

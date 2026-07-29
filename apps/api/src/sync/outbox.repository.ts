import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { schema, type Db } from "@11ftc/db";
import { DATABASE } from "../database/database.constants.js";

export type OutboxRow = typeof schema.syncOutbox.$inferSelect;

const MAX_ATTEMPTS = 5;

/**
 * M8 — reads/writes `sync_outbox` (the worker side). `sync_outbox` is not `tickets`/
 * `audit_log`, so it is freely updatable. Correctness lives in these rows + their status,
 * not in the queue (BullMQ is only a trigger).
 */
@Injectable()
export class OutboxRepository {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Oldest PENDING first (FR: ORDER BY created_at), batched. */
  claimPending(limit = 100): Promise<OutboxRow[]> {
    return this.db
      .select()
      .from(schema.syncOutbox)
      .where(eq(schema.syncOutbox.status, "PENDING"))
      .orderBy(asc(schema.syncOutbox.createdAt))
      .limit(limit);
  }

  /** Success — cache the sheet row index (safe: `_raw` is append-only, never shifts). */
  async markSent(outboxId: string, rawRowNumber: number): Promise<void> {
    await this.db
      .update(schema.syncOutbox)
      .set({ status: "SENT", sentAt: new Date(), rawRowNumber, lastError: null })
      .where(eq(schema.syncOutbox.outboxId, outboxId));
  }

  /** Failure — bump attempts; stay PENDING for the next sweep, or FAILED after the cap. */
  async markFailed(outboxId: string, attempts: number, error: string): Promise<void> {
    await this.db
      .update(schema.syncOutbox)
      .set({
        status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
        attempts,
        lastError: error.slice(0, 1000),
      })
      .where(eq(schema.syncOutbox.outboxId, outboxId));
  }
}

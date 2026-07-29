import { Injectable, Logger } from "@nestjs/common";
import type { SheetRowPayload } from "../outbox/outbox.service.js";
import { OutboxRepository, type OutboxRow } from "./outbox.repository.js";
import { SheetsClient } from "./sheets.client.js";

/**
 * M8 — Sync Worker (read side). Drains PENDING outbox rows to the append-only `_raw` tab and
 * marks them SENT. Invariants (.claude/rules/sync-worker.md):
 *  - Locate rows by `row_key`, never a remembered position (silent-corruption bug otherwise).
 *  - Idempotent (FR-30): a retried row UPDATES the existing sheet row, never appends a dupe.
 *  - Isolation (FR-29): a Sheets/credentials failure marks the row FAILED/PENDING and NEVER
 *    throws up — encoding is on another process and is unaffected.
 *  - One-way only (FR-25): appends/updates, never reads ticket data back.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly sheets: SheetsClient,
  ) {}

  /** Claim a batch of PENDING rows and process each independently. */
  async drain(batchSize = 100): Promise<{ sent: number; failed: number }> {
    const rows = await this.outbox.claimPending(batchSize);
    let sent = 0;
    let failed = 0;
    for (const row of rows) {
      if (await this.processRow(row)) sent++;
      else failed++;
    }
    if (rows.length) this.logger.log(`drain: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /** Write one outbox row to `_raw`, idempotently. Returns true on success (never throws). */
  async processRow(row: OutboxRow): Promise<boolean> {
    try {
      const payload = row.payload as SheetRowPayload;
      // Locate by row_key (the authority). raw_row_number is only a retry cache — safe
      // because `_raw` is append-only and never shifts.
      const existing =
        row.rawRowNumber ?? (await this.sheets.locateByRowKey(row.rowKey));

      let rowNumber: number;
      if (existing != null) {
        await this.sheets.updateRow(existing, payload); // idempotent: retry updates, no dupe
        rowNumber = existing;
      } else {
        rowNumber = await this.sheets.appendRow(payload);
      }

      await this.outbox.markSent(row.outboxId, rowNumber);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `sync failed for ${row.rowKey} (attempt ${row.attempts + 1}): ${msg}`,
      );
      await this.outbox.markFailed(row.outboxId, row.attempts + 1, msg);
      return false;
    }
  }
}

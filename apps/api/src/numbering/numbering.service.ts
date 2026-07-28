import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { schema, type Tx } from "@11ftc/db";

export type TicketNumberScope = "date" | "year";

export interface AllocatedNumber {
  ticketNo: string;
  sequenceScope: string;
  sequenceNumber: number;
}

/**
 * M3 — Ticket Numbering. THE highest-risk module (~40 lines). Allocates a per-scope sequence
 * number with an ATOMIC upsert inside the CALLER'S transaction. See .claude/rules/numbering.md.
 *
 * Invariants:
 *  1. Never `SELECT MAX(sequence_number)+1` — that's a lost-update race.
 *  2. Shares the caller's `tx`; NEVER opens its own transaction (that releases the lock early).
 *  3. `UNIQUE (sequence_scope, sequence_number)` (`uq_ticket_seq`) is the last line of defence.
 *  4. `ticket_no` is returned to be persisted once, never recomputed on read.
 *  5. Gaps are acceptable; duplicates are corruption. (This design actually reuses a
 *     rolled-back number, so it is gap-free — the counter increment is transactional.)
 */
@Injectable()
export class NumberingService {
  constructor(private readonly scope: TicketNumberScope) {}

  /** scope_key from the ENCODED date (not today) → backdating just works (FR-5). */
  scopeKeyFor(date: Date): string {
    const iso = date.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    return this.scope === "date" ? iso : iso.slice(0, 4);
  }

  async next(date: Date, tx: Tx): Promise<AllocatedNumber> {
    const scopeKey = this.scopeKeyFor(date);

    // Atomic allocation. ON CONFLICT DO UPDATE takes a row lock, so a concurrent allocation
    // for the same scope blocks until this transaction commits/rolls back, then reads the
    // incremented value — never a stale one. `last_sequence + 1` references the EXISTING row.
    const rows = await tx
      .insert(schema.ticketSequence)
      .values({ scopeKey, lastSequence: 1 })
      .onConflictDoUpdate({
        target: schema.ticketSequence.scopeKey,
        set: {
          lastSequence: sql`${schema.ticketSequence.lastSequence} + 1`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ lastSequence: schema.ticketSequence.lastSequence });

    const row = rows[0];
    if (!row) throw new InternalServerErrorException("numbering: no sequence row returned");
    const sequenceNumber = row.lastSequence;

    return {
      sequenceScope: scopeKey,
      sequenceNumber,
      ticketNo: this.format(date, sequenceNumber),
    };
  }

  /** `IT-2026-0715-001` (date-scoped) or `IT-2026-0174` (year-scoped). */
  private format(date: Date, seq: number): string {
    const iso = date.toISOString().slice(0, 10);
    const year = iso.slice(0, 4);
    if (this.scope === "date") {
      const month = iso.slice(5, 7);
      const day = iso.slice(8, 10);
      return `IT-${year}-${month}${day}-${String(seq).padStart(3, "0")}`;
    }
    return `IT-${year}-${String(seq).padStart(4, "0")}`;
  }
}

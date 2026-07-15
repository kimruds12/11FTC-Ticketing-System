# M3 — Ticket Numbering

**Realizes:** FR-4, FR-5, §8, §9 · **Depends on:** — · **Risk: HIGHEST**
**Folder:** `apps/api/src/numbering/` · **Rule:** `.claude/rules/numbering.md`
**Diagram:** `docs/diagrams/02-ticket-number-sequence.d2`

> ~40 lines of code. The bug it prevents is invisible in every manual test and corrupts
> data the first busy morning. **Write the concurrency test before the module.**

## Contract

```ts
next(date: Date, tx: Tx): { ticketNo: string; sequenceScope: string; sequenceNumber: number }
```

Allocated **inside the caller's transaction**, unique within its scope, correct under
concurrency, correct when backdating.

## The order of work (do not reorder)

1. **First**, write `numbering.concurrency.spec.ts` for real (the stub exists and fails on
   purpose). 50 concurrent `next()` calls, same date, each in its own transaction →
   `expect(new Set(numbers).size).toBe(50)`. This test *is* the spec.
2. Then implement `NumberingService` until it passes.

## Implementation

```ts
// scopeKeyFor derives from the date being ENCODED, not today → backdating just works.
scopeKeyFor(date, scope) {
  return scope === "date" ? formatISODate(date) /* '2026-07-15' */ : String(date.getFullYear()); /* '2026' */
}

async next(date, tx) {
  const scopeKey = this.scopeKeyFor(date, this.config.scope);
  // Atomic upsert — ON CONFLICT DO UPDATE takes a row lock; the 2nd tx blocks then reads.
  const [{ last_sequence }] = await tx.execute(sql`
    INSERT INTO ticket_sequence (scope_key, last_sequence, updated_at)
    VALUES (${scopeKey}, 1, now())
    ON CONFLICT (scope_key)
    DO UPDATE SET last_sequence = ticket_sequence.last_sequence + 1, updated_at = now()
    RETURNING last_sequence;
  `);
  return {
    sequenceScope: scopeKey,
    sequenceNumber: last_sequence,
    ticketNo: this.format(date, scopeKey, last_sequence),
  };
}
```

`format` → `IT-2026-0715-001` (date-scoped) or `IT-2026-0174` (year-scoped).

## Invariants

1. **Never `SELECT MAX(sequence_number)+1`.** Lost-update race: two encoders read 20, both
   write 21, uniqueness silently broken.
2. **Share the caller's transaction.** A separate tx releases the lock early → race returns.
   `next()` takes `tx`; it must never call `this.db.transaction(...)` itself.
3. **`UNIQUE (sequence_scope, sequence_number)` exists in the DB** (`uq_ticket_seq`, already
   in the schema). The upsert is the first line; the constraint is the last.
4. **`ticket_no` persisted once, never recomputed on read.** Backdated rows keep their
   number when the scheme changes.
5. **Gaps on rollback are accepted.** A gap is cosmetic; a duplicate is corruption.

## OPEN-1

`this.config.scope` comes from `TICKET_NUMBER_SCOPE`. Confirm date-vs-year against the real
sheet before go-live. Backdating behaves differently between the two (year-scoped can hand
a backdated ticket a *higher* number than later-dated ones) — that's fine, but tell the IT
team to expect it.

## API surface

**None — internal only.** No HTTP route allocates a number. The single entry point is
`NumberingService.next(date, tx)`, called by `TicketService` inside its transaction.
Exposing this over HTTP would leak the lock across a request boundary and reintroduce the
race.

## Observability

- **Log** each allocation: `scope_key`, allocated `sequence_number`, ticket_id (once known).
- **Measure** allocation latency and lock-wait time. Rising lock-wait under load is the
  early signal the sequence row is a contention point (expected, bounded — it's one row).
- A duplicate number is **invisible in logs** — that is exactly why the concurrency test,
  not observability, is the guarantee here.

## Security

- No user-supplied input except the encode `date` (validated upstream in M5). Scope comes
  from `TICKET_NUMBER_SCOPE`, not the request.

## Acceptance criteria

- FR-4: numbers auto-generated, unique within scope, under concurrency.
- FR-5: backdating uses the encoded date's scope.
- The concurrency gate is committed and green (it starts RED as a stub — that's intended).

## Tests that gate merge

- **50 concurrent encodes, one date → 50 distinct numbers.** (the reason this module exists)
- Backdate → number comes from that date's scope, not today's.
- Forced rollback after allocation → next ticket skips a number, no duplicate.
- Flip date-scoped ↔ year-scoped → both produce correct formats.

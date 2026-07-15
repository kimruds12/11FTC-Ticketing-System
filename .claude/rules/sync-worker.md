# Rule: Sheets sync (M7 outbox + M8 worker)

**Applies to:** `apps/api/src/outbox/**`, `apps/api/src/sync/**`, `main.worker.ts`.

Second-highest risk, and the only part that talks to a system we don't control. It fails
silently — it corrupts the *wrong* ticket's row, and only after the sheet has shifted.

## Why `_raw` is append-only (read this before touching the writer)

The IT team's sheet is **newest-first** — each new ticket is inserted at the top, which
shifts every existing row down by one. So any stored row index goes stale the moment the
next ticket is encoded, and a status update or retry then writes to **another ticket's
row**. That is silent corruption.

The fix: the worker only ever **appends** to a hidden `_raw` tab. Row N stays row N
forever. The visible `Tickets` tab is a `=QUERY(_raw...order by ... desc)` view — the team
still sees newest-first, but storage is stable.

## Invariants

1. **Locate rows by `row_key` (the ticket_no), never by remembered position.**
   `raw_row_number` is only a cache of where the row was found in the append-only `_raw`
   tab — safe precisely because `_raw` never shifts. If it's absent or stale, fall back to
   scanning column B for `row_key`.
2. **`_raw` is append-only.** New tickets `values.append`; existing rows `values.update`
   at `raw_row_number`. Never insert-at-top in `_raw`.
3. **The outbox row commits with the ticket** (M7). "Ticket exists" and "sheet owes an
   update" become atomically true together. BullMQ is only a trigger; the job payload
   carries "wake up and drain", never ticket data. A lost job must be harmless.
4. **One-way only (FR-25).** No path reads ticket data back from the sheet. The database
   is the system of record; the sheet is a mirror.
5. **Idempotent (FR-30).** Running the same outbox row twice updates one row, never
   appends a second copy.
6. **Sync failure never fails encoding (FR-29).** Break the Google credentials and
   encoding must still succeed.
7. **Denormalize at the boundary only** (FR-27): `employee_id`→name, `assigned_to`→name,
   `main_issue_id`→label happen here, at write time. IDs stay in Postgres.

## Worker mechanics

- NestJS worker process (`main.worker.ts`), same codebase, separate process.
- BullMQ processor **plus a repeatable job every minute** as a sweeper, so a dropped
  dispatch is picked up on the next tick. `sync_outbox.status`/`attempts` are the source
  of truth, not the queue.
- Claim: `WHERE status='PENDING' ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`.
- Retry: `attempts++`, exponential backoff, `FAILED` after 5, surfaced in Bull Board.
- Batch 100 rows per call — Sheets allows ~60 writes/min/user. Matters most at backfill.

## Open item

- **OPEN-3:** if the IT team must keep hand-editing the sheet, the fallback is
  `InsertDimensionRequest` + developer metadata pinned per row — never a bare row index.

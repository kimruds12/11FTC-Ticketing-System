# Rule: Sheets sync (M7 outbox + M8 worker)

**Applies to:** `apps/api/src/outbox/**`, `apps/api/src/sync/**`, `main.worker.ts`.

Second-highest risk, and the only part that talks to a system we don't control. It fails
silently — it corrupts the *wrong* ticket's row, and only after the sheet has shifted.

## Why position is never trusted (read this before touching the writer)

The IT team's sheet is **newest-first** — each new ticket is inserted at the top, which
shifts every existing row down by one. So any stored row index goes stale the moment the
next ticket is encoded, and a status update or retry then writes to **another ticket's
row**. That is silent corruption, and it is the failure this module exists to prevent.

The worker writes **directly into the visible `Tickets` tab**, inserting new tickets at the
top so the team's ordering and workflow are preserved (ADR-0016, superseding the `_raw`
design in ADR-0003). Because rows therefore *do* shift, the safety property rests entirely
on rule 1 below — there is no longer a structural safety net.

## Invariants

1. **Locate rows by `row_key` (the ticket_no), never by remembered position.**
   Every operation re-scans column B for the ticket number. `raw_row_number` is a
   **diagnostic breadcrumb that is written but never read back**. Do not "optimise" the
   scan away by trusting it — that reintroduces the corruption bug directly.
2. **New tickets are inserted ABOVE the first ticket row** (`InsertDimensionRequest`), then
   filled; existing tickets are updated in place wherever they now sit. Header and spacer
   rows are located by value, never assumed.
3. **Columns A–I only** — `Date, Ticket No, Employee, Department, Main issue, Concern,
   Assigned to, Status, Remarks`, mirroring the team's existing layout exactly. Do not add
   columns (e.g. `ongoing_at`/`closed_at`) the team did not ask for; Postgres is the system
   of record for those.
4. **The outbox row commits with the ticket** (M7). "Ticket exists" and "sheet owes an
   update" become atomically true together. BullMQ is only a trigger; the job payload
   carries "wake up and drain", never ticket data. A lost job must be harmless.
5. **One-way only (FR-25).** No path reads ticket data back from the sheet. The database
   is the system of record; the sheet is a mirror.
6. **Idempotent (FR-30).** Running the same outbox row twice updates one row, never
   inserts a second copy.
7. **Sync failure never fails encoding (FR-29).** Break the Google credentials and
   encoding must still succeed.
8. **Denormalize at the boundary only** (FR-27): `employee_id`→name, `assigned_to`→name,
   `main_issue_id`→label happen here, at write time. IDs stay in Postgres.

## Worker mechanics

- NestJS worker process (`main.worker.ts`), same codebase, separate process.
- BullMQ processor **plus a repeatable job every minute** as a sweeper, so a dropped
  dispatch is picked up on the next tick. `sync_outbox.status`/`attempts` are the source
  of truth, not the queue.
- Claim: `WHERE status='PENDING' ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`.
- Retry: `attempts++`, exponential backoff, `FAILED` after 5, surfaced in Bull Board.
- Batch 100 rows per call — Sheets allows ~60 writes/min/user. Matters most at backfill.

## Resolved

- **OPEN-3 — answered.** The IT team does keep working in the `Tickets` tab, so the worker
  writes there directly with `InsertDimensionRequest` (ADR-0016) instead of adopting a
  read-only `=QUERY(_raw ...)` view. Hand-edited rows are fine as long as column B holds the
  ticket number — rows are found by value, never by a remembered index.

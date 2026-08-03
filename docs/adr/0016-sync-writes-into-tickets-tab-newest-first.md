# ADR-0016 — Sync writes directly into the `Tickets` tab, newest-first

**Status:** Accepted · **Supersedes:** the `_raw` half of [ADR-0003](0003-transactional-outbox-append-only-raw-tab.md) · **Realizes:** FR-25–32

## Context

ADR-0003 chose a hidden, append-only `_raw` tab with the visible `Tickets` tab as a
`=QUERY(_raw ... order by desc)` view. The reasoning was sound: the team's sheet is
newest-first, so inserting at the top shifts every row down, and any stored row index goes
stale immediately — a later status update would then write to **another ticket's row**.
Append-only `_raw` made row N stay row N forever.

Two things changed once the system met the real sheet:

1. **A `QUERY` view is read-only.** The IT team inserts rows into `Tickets` by hand today, and
   a formula owns every cell of its output — adopting `_raw` would have taken that away
   (this was **OPEN-3**, now answered: they keep working in `Tickets`).
2. **The team's requirement is that a newly encoded ticket appears at the top of the `Tickets`
   tab they already use** — not in a hidden tab, and not behind a view they'd have to adopt.

The transactional-outbox half of ADR-0003 is unaffected and still stands.

## Decision

The worker writes **directly into the visible `Tickets` tab**, inserting each new ticket at the
top of the data block via `InsertDimensionRequest`, then filling columns A–I.

**Row positions are never remembered.** This is the load-bearing part. Because a top insert
shifts everything below it, `sync_outbox.raw_row_number` is now a diagnostic breadcrumb only —
it is written but **never read back**. Every operation re-locates its row by `ticket_no` in
column B:

- found → update that row in place (idempotent, FR-30)
- not found → insert a blank row above the first ticket row, then write it

Columns are **A–I only**, exactly mirroring the team's existing layout
(`Date, Ticket No, Employee, Department, Main issue, Concern, Assigned to, Status, Remarks`).
`ongoing_at`/`closed_at` are deliberately not written: the sync must not add columns the team
did not ask for. Postgres remains the system of record for those.

## Consequences

- The team's workflow is untouched — they keep reading (and editing) the same tab, and encoded
  tickets appear where they expect, at the top.
- **The safety property now rests entirely on "locate by `row_key`, never by position."** With
  `_raw` that rule had a safety net (rows never moved); here it is the only thing preventing
  silent corruption of the wrong ticket's row. It is enforced in `SyncService.processRow`,
  asserted by a gating test, and must not be "optimised" by trusting the cached index.
- **Cost: one extra read per sync** (column B scan) — roughly 2–3 API calls per ticket instead
  of 1–2. At tens of tickets/day that is far inside the ~60 requests/min/user quota. It would
  matter for a bulk backfill; that is not how this system is used.
- A hand-inserted row in `Tickets` no longer breaks anything, provided column B holds the
  ticket number: the worker finds rows by value, not position.
- One-way sync (FR-25) is unchanged — the worker inserts and updates, and never reads ticket
  data back into the database.

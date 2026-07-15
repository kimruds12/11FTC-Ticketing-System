# ADR-0003 — Transactional outbox + append-only `_raw` tab for sheet sync

**Status:** Accepted · **Realizes:** FR-25–32 · **Diagrams:** SYNC, SQ3, ERD

## Context

The sheet is the mirror; the database is the system of record. Two failure modes must be
designed out:

1. A ticket that commits but never reaches the sheet (a direct API call that fails after
   the DB commit, with nothing that knows).
2. Writing to the **wrong row**: the team's sheet is newest-first, so inserting at the top
   shifts every row down — any stored row index is stale the moment the next ticket is
   encoded, and a status update lands on another ticket's row. Silent corruption.

## Decision

- **Transactional outbox:** the outbox row is written in the *same transaction* as the
  ticket. BullMQ carries only a "wake up and drain" trigger — never ticket data. A lost
  job is harmless; a minute-sweeper repeatable job catches anything missed.
- **Append-only `_raw` tab:** the worker only ever appends to a hidden `_raw` tab, so row N
  stays row N forever. The visible `Tickets` tab is a `=QUERY(_raw ... order by desc)`
  view. Rows are located by `row_key` (the ticket_no), never by remembered position;
  `raw_row_number` is a cache, safe only because `_raw` never shifts.

## Consequences

- "Ticket exists" and "sheet owes an update" become atomically true together.
- Idempotent retries (FR-30) and one-way sync (FR-25) hold by construction.
- The `Tickets` QUERY view is read-only — if anyone hand-edits the sheet today (**OPEN-3**),
  that workflow moves into the app, or the fallback is `InsertDimensionRequest` + developer
  metadata (never a bare stored index).

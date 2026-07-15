# ADR-0004 — Ticket numbers via atomic sequence upsert; `scope_key` defers OPEN-1

**Status:** Accepted · **Realizes:** FR-4, FR-5, §8, §9 · **Diagrams:** SQ1, ERD

## Context

`SELECT MAX(sequence_number)+1` is a lost-update race: two encoders read 20, both write 21,
uniqueness is silently broken. It passes every manual test and fails the first busy
morning. Separately, the numbering scope (per-date vs per-year) is unconfirmed (**OPEN-1**)
and must not block building.

## Decision

- Allocate with an atomic upsert against a dedicated `ticket_sequence` table
  (`INSERT ... ON CONFLICT (scope_key) DO UPDATE SET last_sequence = last_sequence + 1
  RETURNING last_sequence`), **inside the caller's transaction**.
- Back it with a database constraint `UNIQUE (sequence_scope, sequence_number)`.
- Key the sequence on a generic **`scope_key`** (`'2026-07-15'` or `'2026'`), derived from
  the date being encoded — so date- vs year-scoping is a config flag (`TICKET_NUMBER_SCOPE`)
  plus a backfill, not a migration.

## Consequences

- Correct under concurrency and when backdating. Gaps on rollback are accepted (a gap is
  cosmetic; a duplicate is corruption).
- The **50-concurrent-encodes → 50-distinct-numbers** test is the module's specification;
  it is written before M3. See `.claude/rules/numbering.md`.
- OPEN-1 must be confirmed against the real sheet before go-live; year-scoped backdating
  can yield a higher number than later-dated tickets (acceptable, but tell the IT team).

# ADR-0008 — No cache / no materialized views for analytics initially

**Status:** Accepted · **Realizes:** FR-17–24, §4 · **Diagrams:** STM, ERD

## Context

The dashboard needs daily/weekly/monthly aggregates. It is tempting to reach for a Redis
cache or materialized views immediately. At tens of tickets/day the whole table sits in
Postgres's buffer cache, and a cache round-trip can be slower than the query.

## Decision

- Serve analytics from **indexed queries over Postgres**, no response cache and no
  materialized views to start. Add them only if a query exceeds ~500 ms, in this order:
  index → cached response → materialized view refreshed by a BullMQ repeatable job.
- Bucket "problems solved" by **`closed_at`** (not `date`, not `updated_at`). First-time
  fix rate is `ongoing_at IS NULL` on a Closed ticket — no extra column.

## Consequences

- Cache-invalidation bugs (far harder to find than slow queries) are avoided until there is
  a query slow enough to justify them.
- Editing a remark on a ticket closed last month does not move it into this month's numbers
  (FR-21). Volume counts tickets, not distinct problems — recurrence stays visible.
- Redis is already present for BullMQ, so adding a response cache later is a small change,
  not new infrastructure.

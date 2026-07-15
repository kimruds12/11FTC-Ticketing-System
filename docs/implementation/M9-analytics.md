# M9 — Analytics

**Realizes:** FR-17–24 · **Depends on:** M1 · **Risk:** Low
**Folder:** `apps/api/src/analytics/`

## Contract

Read-only aggregates over Postgres. **No writes.**

## Metrics

| FR | Metric | Bucket by |
|---|---|---|
| FR-17 | Volume | `date` |
| FR-18–20 | By department / technician / category | `date` |
| FR-21 | **Problems solved** | **`closed_at`** |
| FR-22 | Open vs Ongoing vs Closed | current status |
| FR-23 | **First-time fix rate** | `status='Closed' AND ongoing_at IS NULL` |
| FR-24 | Ongoing ageing | `now() - ongoing_at` |

Query shapes are in System Design §4 — copy them; they are already correct.

## Invariants

1. **FR-21 buckets by `closed_at`, not `date` and not `updated_at`.** Editing a remark on a
   ticket closed last month must not move it into this month's figures; bucketing by `date`
   would credit the fix to the week the problem was *reported*.
2. **FR-17 counts tickets, not distinct problems.** Closed is terminal, so a printer
   failing four times is four rows — correct (recurrence becomes visible), but no chart may
   be *labelled* as a count of problems.
3. **`ongoing_at IS NULL` on a Closed ticket IS the first-time-fix signal.** No extra
   column, no flag to keep in sync.

## Performance — do the cheap thing first

**No Redis cache and no materialized views initially** (System Design §4). At tens of
tickets/day the table is in Postgres's buffer cache; a cache round-trip can be slower than
the query, and cache-invalidation bugs are far harder to find than slow queries.

Ladder, only as needed: add the index → cache the response (5-min) → materialized view
refreshed by a BullMQ repeatable job. Revisit only if a query exceeds ~500 ms.

## OPEN-2

Whether IT Staff may view the dashboard is unconfirmed. Keep the guard on the analytics
controller a single `@Roles(...)` line so the decision is one edit.

## API surface

| Method + path | Metric | FR |
|---|---|---|
| `GET /analytics/volume?from&to` | tickets by period | FR-17 |
| `GET /analytics/by-department` / `by-technician` / `by-category` | breakdowns | FR-18–20 |
| `GET /analytics/solved?from&to` | problems solved (by `closed_at`) | FR-21 |
| `GET /analytics/status` | Open/Ongoing/Closed counts | FR-22 |
| `GET /analytics/first-time-fix?from&to` | `ongoing_at IS NULL` on Closed | FR-23 |
| `GET /analytics/ongoing-ageing` | `now() - ongoing_at` | FR-24 |

All read-only, all take a date window where relevant. DTOs in
`@11ftc/shared/dto/analytics.dto.ts`.

## Observability

- **Measure** per-endpoint query latency. The ~500 ms threshold is the trigger to climb the
  performance ladder (index → cache → materialized view) — not before (ADR-0008).

## Security

- `@Roles` gate. Admin always; IT-Staff access is **OPEN-2** — keep it a single line so the
  decision is one edit.
- Read-only: no analytics route writes.

## Acceptance criteria

- FR-17–24 each return correct figures over a date window.
- FR-21 buckets by `closed_at`; FR-23 excludes tickets that passed through Ongoing.
- No cache/materialized views until a query is measured slow.

## Tests that gate merge

- A ticket closed in month N, remark edited in month N+1 → still counted in month N.
- First-time fix excludes tickets that passed through Ongoing.

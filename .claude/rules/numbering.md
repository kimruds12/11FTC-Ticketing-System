# Rule: ticket numbering (M3 — the highest-risk module)

**Applies to:** `apps/api/src/numbering/**` and `packages/db/schema/ticket-sequence`.

Perhaps 40 lines of code. The bug it prevents is invisible in every manual test and
corrupts data in production the first busy morning. Treat it accordingly.

## The one correct implementation

Allocate inside the caller's transaction (the `TicketService` `tx`), with an atomic upsert:

```sql
INSERT INTO ticket_sequence (scope_key, last_sequence, updated_at)
VALUES (:scope_key, 1, now())
ON CONFLICT (scope_key)
DO UPDATE SET last_sequence = ticket_sequence.last_sequence + 1,
              updated_at = now()
RETURNING last_sequence;
```

`ON CONFLICT DO UPDATE` takes a row lock; the second transaction blocks until the first
commits, then reads the updated value.

## Invariants

1. **Never `SELECT MAX(sequence_number)+1`.** That is a lost-update race: two encoders
   read 20, both write 21, uniqueness is broken and nothing tells you.
2. **Allocation shares the caller's transaction.** A separate transaction releases the
   lock early and the race returns.
3. **`UNIQUE (sequence_scope, sequence_number)` exists in the database.** App logic is the
   first line of defence; the constraint is the last.
4. **`ticket_no` is persisted once, never recomputed on read.** Backdated rows keep their
   number when the scheme changes.
5. **Gaps on rollback are accepted.** A gap is cosmetic; a duplicate is corruption.

## Scope key (OPEN-1 — config, not structure)

`scopeKeyFor(date)` derives the key from **the date being encoded**, not from today — so
backdating (FR-5) needs no special case.

| `TICKET_NUMBER_SCOPE` | `scope_key` | `ticket_no` |
|---|---|---|
| `date` | `'2026-07-15'` | `IT-2026-0715-001` |
| `year` | `'2026'` | `IT-2026-0174` |

Same table, same lock, same code path — only the formatting differs. Switching later is a
config change plus a backfill, not a migration.

## The test that is the spec

**50 concurrent encodes, one date → 50 distinct numbers.** Write it before writing M3
(`pnpm test:concurrency`). Also: backdate uses that date's scope; forced rollback skips a
number without duplicating; flipping date↔year scope produces correct formats.

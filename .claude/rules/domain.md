# Rule: the domain transaction boundary

**Applies to:** `apps/api/src/ticket/**`, and anything it calls (numbering, employee,
audit, outbox).

`TicketService` is **the** transaction boundary for the whole system. This is the single
most important structural rule; most of the other invariants ride on it.

## The rule

1. `TicketService` opens exactly one transaction per mutating operation (encode, update,
   assign, mark-ongoing, close). It passes the `tx` handle down.
2. **Nothing below `TicketService` opens its own transaction.** `NumberingService`,
   `EmployeeService`, `AuditService`, and `OutboxService` all accept a `tx` and run inside
   the caller's. If any of them opens a new connection/transaction, the atomicity
   guarantee is silently gone.
3. The number, the ticket row, the audit rows (one per changed field), and the outbox row
   **commit together or not at all**.
4. **BullMQ dispatch happens AFTER commit.** If you enqueue inside the transaction, the
   worker can pick up the job and query a row that has not landed yet.

## Mutation shape (state changes)

```
BEGIN
  SELECT ... FOR UPDATE            -- lock the ticket row first
  canTransitionTo(current, next)   -- legality check AFTER the lock, server-side
  UPDATE ticket ...                -- set ongoing_at/closed_at once, here
  AuditService.log(..., tx)        -- one row per changed field
  OutboxService.enqueue(..., tx)   -- PENDING row, row_key = ticket_no
COMMIT
dispatch BullMQ "drain" trigger    -- after commit only
```

The lock must precede the legality check. Without it, two users both read `Ongoing`, both
judge their transition legal, and the audit log records a transition that never happened.

## Status rules (SRS §4.1, FR-1/2/7/8)

- Three statuses only: **Open, Ongoing, Closed**. Adding a fourth means revisiting the
  state machine, M5, and M9 together — don't do it casually.
- Encoding form **defaults to Closed** (work happens before the ticket).
- Created as Closed → `closed_at = now()`, `ongoing_at` stays NULL.
- Created as Ongoing → `ongoing_at = now()`.
- Created as Open → neither timestamp.
- **Closed is terminal.** No transition out of Closed. No reopen route exists.
- `ongoing_at` and `closed_at` are set **once**, never recomputed.

## Never

- No `DELETE` against `tickets`. Corrections are edits; the audit log carries them (FR-9).
- No business logic in `apps/web`. The state machine is enforced here, server-side.

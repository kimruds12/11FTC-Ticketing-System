# M7 — Sync Outbox (write side)

**Realizes:** FR-31, §9A · **Depends on:** — · **Risk:** High
**Folder:** `apps/api/src/outbox/` · **Rule:** `.claude/rules/sync-worker.md`
**Diagram:** `docs/diagrams/03-sheets-sync.d2`

## Contract

```ts
enqueue(ticketId: string, payload: SheetRowPayload, tx: Tx): void
```

Writes a `PENDING` row **in the caller's transaction**.

## Implementation

```ts
async enqueue(ticketId, payload, tx) {
  await tx.insert(syncOutbox).values({
    ticketId,
    operation: "UPSERT",
    rowKey: payload.ticketNo,   // row_key = ticket_no → locate by content, not position
    payload,                    // the projected, denormalized row (names + labels)
    status: "PENDING",
    attempts: 0,
  });
}
```

`payload` is the **denormalized** sheet row — employee name, assigned-to name, main-issue
label — computed by M5 at enqueue time. IDs do not go to the sheet. (Denormalize only at
the boundary; this write *is* the boundary on the DB side, M8 is the boundary on the wire.)

## Invariants

1. **The outbox row commits with the ticket.** This makes "the ticket exists" and "the
   sheet owes an update" atomically true together. Written afterwards, a crash in between
   leaves a ticket the sheet never hears about — and nothing that knows.
2. **The outbox is the durable record; BullMQ is only a trigger.** The job payload carries
   "wake up and drain", never ticket data. A lost job must be harmless — the row is still
   `PENDING` and the minute-sweeper will catch it.
3. **Correctness never depends on `raw_row_number`.** It's a cache M8 fills in after a
   successful write. If absent or stale, M8 locates the row by `row_key`.

## Every ticket write path enqueues

Encode, update, mark-ongoing, close — each produces an outbox row in the same tx. There is
no "silent" mutation that skips the sheet.

## API surface

**None.** `OutboxService.enqueue(ticketId, payload, tx)` is called by `TicketService`
inside its transaction. The outbox is internal machinery, not a public resource.

## Observability

- **Measure** the PENDING outbox depth — this is the sync SLO. A growing PENDING count
  means the worker (M8) is behind or Sheets is failing; encoding is unaffected, but the
  mirror is going stale.
- **Log** enqueue with `ticketId`, `row_key`, and the write path (encode/update/ongoing/close).

## Security

- `payload` is the denormalized sheet row (names + labels) — no secrets, no service keys.

## Acceptance criteria

- FR-31: the outbox row commits in the same transaction as the ticket.
- Every ticket write path produces exactly one outbox row; a rolled-back ticket produces none.

## Tests that gate merge

- Ticket insert rolled back → **no** outbox row (proves same-transaction).
- An outbox row exists for every ticket write path.

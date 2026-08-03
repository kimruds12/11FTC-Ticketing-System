# M5 — Ticket Encoding & Lifecycle

**Realizes:** FR-1, FR-2, FR-3, FR-5, FR-7, FR-8, FR-9 · **Depends on:** M1–M4, M6, M7
**Risk:** High · **Folder:** `apps/api/src/ticket/` · **Rule:** `.claude/rules/domain.md`
**Diagrams:** `07-ticket-state-machine.d2`, `08-sequence-ticket-lifecycle.d2`

## Contract

`TicketService` is **THE transaction boundary**. Number, ticket, audit rows, and outbox
row commit together or not at all.

## Files to create

```
ticket/
├── ticket.module.ts          (exists — wires M3/M4/M6/M7)
├── ticket.service.ts         (exists — scaffold; the tx boundary)
├── ticket.controller.ts      encode / update / assign / mark-ongoing / close / list
├── ticket.repository.ts      Drizzle reads/writes, all taking tx
├── state-machine.ts          canTransitionTo(current, next) — pure, server-side
└── ticket.service.spec.ts    the gating tests
```

## Encode (create)

The department **solves first, records after** — the form **defaults to Closed**. All
three statuses are selectable at creation (FR-2):

| Created as | Sets |
|---|---|
| Closed | `closed_at = now()`, `ongoing_at` stays NULL |
| Ongoing | `ongoing_at = now()` |
| Open | neither |

```ts
async encode(input, actor) {
  const ticket = await this.db.transaction(async (tx) => {
    const employee = await this.employee.resolveOrCreate(input.employeeName, input.departmentId, tx); // M4
    const num = await this.numbering.next(input.date, tx);                                            // M3
    const row = await this.repo.insert({ ...input, ...num, ...timestampsFor(input.status), createdBy: actor.userId }, tx);
    await this.audit.log("CREATE", row.ticketId, diffFromEmpty(row), actor, tx);                      // M6
    await this.outbox.enqueue(row.ticketId, project(row, /* names+labels */), tx);                    // M7
    return row;
  });
  await this.dispatchDrain();  // AFTER commit
  return ticket;
}
```

## Mutations (update / assign / mark-ongoing / close)

```
BEGIN
  SELECT ... FOR UPDATE            -- lock the row FIRST
  canTransitionTo(current, next)   -- legality AFTER the lock, server-side
  UPDATE ... (set ongoing_at/closed_at once, here)
  audit.log(one row per changed field)
  outbox.enqueue(...)
COMMIT
dispatchDrain()
```

## Invariants

1. **Nothing below `TicketService` opens its own transaction.** That is the whole
   guarantee. M3, M4, M6, M7 all take `tx`.
2. **The state machine is enforced server-side.** `07` is not a UI hint. `Open→Open` or any
   `Closed→*` is rejected by `state-machine.ts`, not just disabled in the form.
3. **`ongoing_at` / `closed_at` set once, never recomputed.** FR-21/FR-23 depend on it.
4. **Closed is terminal** (FR-8). No reopen route exists. Recurrence → new ticket.
5. **No delete route exists** (FR-9). Corrections are edits; the audit log carries them.
   CI (`check:no-delete`) fails the build if a DELETE against `tickets` appears.
6. **Dispatch to BullMQ happens AFTER commit.** Inside the tx, the worker could pick up the
   job and query a row that hasn't landed.

## Watch-out

**The lock must precede the legality check.** Without `FOR UPDATE` first, two users both
read `Ongoing`, both judge their transition legal, and the audit log records a transition
that never happened.

## Search / list (FR-3)

Filter by date range, status, department, main issue, employee, assigned technician. Read
path only — no tx needed. Back with the indexes already in the schema.

## API surface

| Method + path | Purpose | Errors |
|---|---|---|
| `POST /tickets` | Encode (any status; defaults Closed) | 400 invalid body |
| `PATCH /tickets/:id` | Update fields | 409 illegal transition |
| `POST /tickets/:id/assign` | Replace the technician list (names; ADR-0017) | 404 |
| `POST /tickets/:id/ongoing` | → Ongoing (sets `ongoing_at`) | 409 |
| `POST /tickets/:id/close` | → Closed (sets `closed_at`) | 409 |
| `GET /tickets` | List + filter (FR-3) | — |
| `GET /tickets/:id` | Detail + audit history | 404 |

All routes require a session (M1); both roles may act. DTOs in
`@11ftc/shared/dto/ticket.dto.ts`. An illegal state transition is a **409** from the domain
layer, not a 400 — the request was well-formed, the state said no.

## Observability

- **Log** every transition: `ticketId`, `from`→`to`, actor, and whether an outbox row was
  enqueued. This is the audit trail's operational twin.
- **Measure** encodes/min, transition-rejection rate, and transaction duration. A rising tx
  duration is the first sign the lock-then-check path is contending.
- **Trace** the whole `TicketService` transaction as one span so a mid-tx failure is legible.

## Security

- `@Roles` allows both IT roles for all ticket actions (§3.3).
- The state machine is enforced **server-side** — a client that posts an illegal transition
  is rejected regardless of what the UI allowed.
- **No delete route exists** (FR-9); `check:no-delete` fails the build if one appears.

## Acceptance criteria

- FR-1/2/7: three statuses, encode-any-status, timestamps set once.
- FR-3: filter by date range, status, department, issue, employee, technician.
- FR-5: backdated encode. FR-8: no path leaves Closed. FR-9: no delete path.
- Number + ticket + audit + outbox commit atomically; dispatch is post-commit.

## Tests that gate merge

- Encode as Closed → `closed_at` set, `ongoing_at` NULL, one CREATE audit row, one outbox
  row — **all in one transaction**.
- Any transition out of Closed → rejected.
- No route can DELETE a ticket.
- Simulated failure mid-transaction → no ticket, no number consumed beyond the gap, no
  orphan outbox row.
- Backdated encode (FR-5).

# Backend implementation overview

The API is a **modular monolith** (NestJS) plus **one worker process** (BullMQ consumer),
sharing a codebase and the `@11ftc/db` schema. This document is the map; each `Mn-*.md`
is a street.

## Processes

| Process | Entrypoint | Contains | Talks to |
|---|---|---|---|
| API | `apps/api/src/main.ts` → `AppModule` | M1–M7, M9 | Postgres, Redis (enqueue), JWKS |
| Worker | `apps/api/src/main.worker.ts` → `WorkerModule` | M8 | Postgres, Redis (consume), Google Sheets |

Same repo, same Drizzle schema, **separate OS processes**. The worker is separated for one
reason: the Google Sheets API is slow, rate-limited, and externally owned. If a sheet
write happened inside an HTTP request, every ticket save would inherit Google's latency
and every Google outage would look like our system being down.

## Layers, top to bottom

```
HTTP controller  (validates DTO with Zod, applies AuthGuard/RolesGuard)
      │
TicketService    ← THE transaction boundary. Opens tx, passes it down.
      │  (tx)
      ├── NumberingService.next(date, tx)        M3
      ├── EmployeeService.resolveOrCreate(…, tx)  M4
      ├── AuditService.log(…, tx)                 M6
      └── OutboxService.enqueue(…, tx)            M7
      │
   COMMIT
      │
   dispatch BullMQ "drain" trigger   (AFTER commit, never inside)
```

**The rule that makes the whole system correct:** everything from `NumberingService` down
receives the transaction handle (`Tx` from `@11ftc/db`) and runs inside it. None of them
open a connection or a transaction of their own. Read `.claude/rules/domain.md` — this is
non-negotiable and it is the thing most likely to be broken by accident.

## Database access

`@11ftc/db` exports `createDb()` (a `pg` Pool + Drizzle) and the `Tx` type. Provide the
`db` instance as a NestJS provider (a `DATABASE` token) and inject it. Transactions:

```ts
await this.db.transaction(async (tx) => {
  const seq = await this.numbering.next(date, tx);
  const ticket = await this.tickets.insert(…, tx);
  await this.audit.log("CREATE", ticket.ticketId, changes, actor, tx);
  await this.outbox.enqueue(ticket.ticketId, payload, tx);
  return ticket;
});
// dispatch happens here, after the awaited transaction resolves
```

Connection is the Supabase **session pooler (5432)** with a normal pool — never
`supabase-js`, which can't do multi-statement transactions (breaks FR-31).

## Configuration

`@nestjs/config`, `.env` from `.env.example`. Validate env at boot with a Zod schema so a
missing `DATABASE_URL` fails fast with a clear message, not a null-pointer three calls
deep. Numbering scope comes from `TICKET_NUMBER_SCOPE` (`date` | `year`) — **OPEN-1**.

## Testing strategy

| Kind | Runner | Files | Needs |
|---|---|---|---|
| Unit | Vitest | `*.spec.ts` | mocks only |
| Concurrency (M3) | Vitest, isolated config | `*.concurrency.spec.ts` | real Postgres |
| Sync isolation (M8) | Vitest | `*.spec.ts` | Postgres + a broken-creds path |

- `pnpm test` runs unit tests. `pnpm test:concurrency` runs *only* the M3 gate against a
  real database — a mock cannot prove atomicity under contention.
- The concurrency stub currently **fails on purpose** so CI is loud until M3 lands.
  Replace it with the real 50-way test; don't delete it.

## CI gates (`.github/workflows/ci.yml`)

`check:agents` (instruction files in sync) · `check:no-delete` (no DELETE on
tickets/audit_log) · `lint` · `typecheck` · `test` · `test:concurrency`. The last two
protect invariants that fail silently — treat a red there as a data-integrity bug, not a
flaky test.

## Build order

M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9. M3 before M5 because M5 depends on it, and
**write the M3 concurrency test before M3 itself**.

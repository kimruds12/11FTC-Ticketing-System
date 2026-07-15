# 11FTC Ticketing Management System
# Module Specifications

Implementation-level detail per module. Sits between the SRS (*what*) and the code.

**Read `11FTC_System_Design.md` §2.1 first** for the stack. Requirement IDs refer to
`11FTC_SRS_Rev3.md` (rev 4).

**How to use this:** each module has an owner-facing contract — what it must guarantee,
what it must never do, and how you prove it. The **Invariants** and **Tests that gate
merge** sections are the parts worth arguing about; everything else is detail you can
adjust in flight.

---

## Module map

| # | Module | NestJS module | Depends on | Risk |
|---|---|---|---|---|
| M1 | Auth & RBAC | `AuthModule` | Supabase Auth | Low |
| M2 | Master Data | `MasterDataModule` | M1 | Low |
| M3 | Ticket Numbering | `NumberingModule` | — | **Highest** |
| M4 | Employee Resolution | `EmployeeModule` | M2 | Medium |
| M5 | Ticket Encoding | `TicketModule` | M1–M4, M6, M7 | High |
| M6 | Audit Log | `AuditModule` | M1 | Medium |
| M7 | Sync Outbox (write side) | `OutboxModule` | — | High |
| M8 | Sync Worker (read side) | `SyncWorkerModule` | M7 | **Highest** |
| M9 | Analytics | `AnalyticsModule` | M1 | Low |

> **Risk here means "cost of getting it wrong late", not difficulty.** M3 and M8 are
> both easy to write and expensive to fix, because both fail silently — M3 produces
> duplicate numbers only under concurrency, M8 corrupts the wrong ticket's row only
> after the sheet has shifted. Everything else announces its own failure.

---

## M1 — Auth & RBAC

**Realizes:** SRS §3, §3.3, §6C

### Contract
Every request arrives with a verified `AuthContext { userId, role, fullName }` or is
rejected. No route reads the raw JWT.

### Design
- Supabase Auth issues the session JWT. NestJS **verifies locally** via `jose`'s
  `createRemoteJWKSet` against `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`.
- No Supabase round trip per request.
- `AuthGuard` verifies signature/expiry → loads `public.users` by auth UID → attaches context.
- `RolesGuard` + `@Roles('IT_ADMINISTRATOR')` enforces the §3.3 matrix.

### Invariants
1. **`public.users` is the User entity, not `auth.users`.** `assigned_to` and `updated_by` FK to yours.
2. A deactivated user (`is_active = false`) is rejected even with a valid JWT.
3. `service_role` key never leaves the backend.

### Watch-outs
- JWKS is edge-cached ~10 min. Don't cache longer in-process, or key rotation silently rejects valid users.
- Supabase is mid-migration from symmetric HS256 to asymmetric ES256. Confirm which your project issues before writing the verifier.

### Tests that gate merge
- Expired JWT → 401
- Valid JWT, `is_active = false` → 403
- `IT_STAFF` hitting an admin route → 403
- Tampered signature → 401

---

## M2 — Master Data

**Realizes:** FR-10–12, FR-16, §6A, §6B, §6C

### Contract
Owns Department, MainIssueCategory, User, and Employee CRUD. Provides the vocabularies
the encoding form and dashboards depend on.

### Design
- Lookups seeded by migration from the OPEN-4 curated lists.
- **No admin console in v1** (deferred — `13-project-plan-trello.md`). Manage via SQL.
- `is_active` everywhere; nothing is deleted.

### Invariants
1. Retiring a lookup never orphans a historical ticket — `is_active = false`, never `DELETE`.
2. Lookup contents come from the IT team, never invented. **Blocked by OPEN-4.**

### Tests that gate merge
- Deactivating a department leaves existing tickets readable and their department name intact

---

## M3 — Ticket Numbering

**Realizes:** FR-4, FR-5, §8, §9 · **Diagram:** `02-ticket-number-sequence.d2`

> The highest-risk module in the system. It is perhaps 40 lines of code, and the bug it
> prevents is invisible in every manual test.

### Contract
`next(date, tx): { ticket_no, sequence_scope, sequence_number }` — allocated inside the
caller's transaction, unique within its scope, correct under concurrency, correct when
backdating.

### Design
```sql
INSERT INTO ticket_sequence (scope_key, last_sequence, updated_at)
VALUES (:scope_key, 1, now())
ON CONFLICT (scope_key)
DO UPDATE SET last_sequence = ticket_sequence.last_sequence + 1,
              updated_at = now()
RETURNING last_sequence;
```
`scopeKeyFor(date)` → `'2026-07-15'` (date-scoped) or `'2026'` (year-scoped), per config. **OPEN-1.**

### Invariants
1. **Never `SELECT MAX(seq)+1`.** Two encoders both read 20, both write 21. The uniqueness rule is broken and nothing tells you.
2. The allocation **must** share the caller's transaction. A separate transaction releases the lock early and the race returns.
3. `UNIQUE (sequence_scope, sequence_number)` exists **in the database**. App logic is not the guarantee; it's the first line of defence.
4. `ticket_no` is persisted once, never recomputed on read. Backdated rows keep their number when the scheme changes.
5. Gaps on rollback are **accepted**. A gap is cosmetic; a duplicate is data corruption.

### Tests that gate merge
- **50 concurrent encodes, one date → 50 distinct numbers.** This test is why the module exists. Do not merge without it.
- Backdate to a past date → number comes from that date's scope, not today's
- Force a rollback after allocation → next ticket skips a number, no duplicate
- Flip config date-scoped ↔ year-scoped → both produce correct formats

---

## M4 — Employee Resolution

**Realizes:** FR-13, FR-14, FR-15

### Contract
`resolveOrCreate(name, departmentId, tx): Employee` — returns the existing employee or
creates one, without ever creating a near-duplicate.

### Design
- `normalize(name)` = lowercase → trim → collapse internal whitespace.
- Lookup by `name_normalized`; insert on miss, inside the caller's transaction.
- UI surfaces matches as the user types **before** offering "create new" (FR-14).

### Invariants
1. **`normalize()` must be the exact function that computes the stored `name_normalized` column.** If the two ever diverge, the unique index and the lookup disagree, and inline creation starts producing the duplicates it exists to prevent. One function, one place.
2. The unique index is the guarantee. FR-14's UI is a courtesy that prevents most attempts from reaching it.

### Tests that gate merge
- `"Juan Dela Cruz"`, `"juan dela cruz"`, `"Juan  Dela Cruz"` → one employee row
- Concurrent inline creation of the same name → one row, no unique-violation crash surfaced to the user

---

## M5 — Ticket Encoding & Lifecycle

**Realizes:** FR-1, FR-2, FR-3, FR-5, FR-7, FR-8, FR-9 · **Diagrams:** `07`, `08`

### Contract
`TicketService` is **the transaction boundary**. Number, ticket, audit rows, and outbox
row commit together or not at all.

### Design
- **Encoding form defaults to Closed.** The department fixes first, records after.
- All three statuses selectable at creation (FR-2):

| Created as | Sets |
|---|---|
| Closed | `closed_at = now()`, `ongoing_at` stays NULL |
| Ongoing | `ongoing_at = now()` |
| Open | neither |

- Mutations: `SELECT ... FOR UPDATE` → `canTransitionTo()` → update → audit → outbox → commit → dispatch.

### Invariants
1. **Nothing below `TicketService` opens its own transaction.** That is the whole guarantee.
2. **The state machine is enforced server-side.** `07` is not a UI hint. An `Open → Open` or any `Closed → *` request is rejected by the domain layer.
3. `ongoing_at` and `closed_at` are **set once**, never recomputed. FR-21 and FR-23 depend on it.
4. **Closed is terminal** (FR-8). No reopen route exists. Recurrence → new ticket.
5. **No delete route exists** (FR-9). Corrections are edits; the audit log carries them.
6. Dispatch to BullMQ happens **after commit**. Inside the transaction, the worker can pick up the job and query a row that hasn't landed.

### Watch-outs
- The lock must precede the legality check. Without it, two users both read `Ongoing`, both judge their transition legal, and the audit log records a transition that never happened.

### Tests that gate merge
- Encode as Closed → `closed_at` set, `ongoing_at` NULL, audit CREATE row, outbox row — **all in one transaction**
- Any transition out of Closed → rejected
- No route can DELETE a ticket
- Simulated failure mid-transaction → no ticket, no number consumed beyond the gap, no orphan outbox row
- Backdated encode (FR-5)

---

## M6 — Audit Log

**Realizes:** FR-6, FR-33–35, §7

### Contract
`log(action, ticketId, changes[], actor, tx)` — one row **per changed field**, in the
caller's transaction.

### Design
- Application-level, **not database triggers.**
- Actions: CREATE, UPDATE, ASSIGN, STATUS_CHANGE, CLOSE.

### Invariants
1. **Triggers cannot do this job.** The acting user lives in the HTTP session, not the database connection. `updated_by` is the reason this is app-level.
2. One row per field (FR-33). Closing an Ongoing ticket with remarks emits two.
3. Immutable (FR-35). No update or delete route.
4. Same transaction as the change it describes (FR-34).

### Tests that gate merge
- Close-with-remarks → exactly two audit rows, correct `previous_value`/`new_value`
- No route mutates or deletes an audit row

---

## M7 — Sync Outbox (write side)

**Realizes:** FR-31, §9A · **Diagram:** `03-sheets-sync.d2`

### Contract
`enqueue(ticketId, payload, tx)` — writes a PENDING row in the caller's transaction.

### Design
- `row_key` = `ticket_no`. Identifies the sheet row **by content, not position**.
- `raw_row_number` is a **cache only**, filled in by M8 after a successful write.

### Invariants
1. **The outbox row commits with the ticket.** This is what makes "the ticket exists" and "the sheet owes an update" atomically true together. Written afterwards, a crash in between leaves a ticket the sheet never hears about, and nothing that knows.
2. **The outbox is the durable record; BullMQ is only a trigger.** The job payload carries "wake up and drain", never ticket data. A lost job must be harmless.
3. Correctness never depends on `raw_row_number`. If absent or stale, M8 falls back to locating by `row_key`.

### Tests that gate merge
- Ticket insert rolled back → no outbox row
- Outbox row exists for every ticket write path (encode, update, mark ongoing, close)

---

## M8 — Sync Worker

**Realizes:** FR-25–32 · **Diagrams:** `09-sequence-sync-worker.d2`, `03-sheets-sync.d2`

> Second-highest risk, and the only module that talks to a system you don't control.

### Contract
Drain PENDING outbox rows → project to sheet rows → write to `_raw` → mark SENT. Never
block encoding. Never duplicate a row. Never write to the wrong row.

### Design
- NestJS worker process (`main.worker.ts`), same codebase, separate process.
- BullMQ processor + **repeatable job every minute** as a sweeper.
- Claim: `... WHERE status='PENDING' ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`.
- Project: `employee_id` → name, `assigned_to` → name, `main_issue_id` → label (FR-27).
- Write: `values.append` to `_raw` for new; `values.update` at `raw_row_number` for existing; fall back to scanning column B for `row_key`.
- Retry: `attempts++`, exponential backoff, FAILED after 5.

### Invariants
1. **Locate rows by `row_key`, never by remembered position.** The visible sheet is newest-first, so a stored index is stale the moment the next ticket is encoded — and the write lands on *another ticket's row*. This is silent corruption. It is the reason `_raw` is append-only.
2. **`_raw` is append-only**, so a cached row index stays valid forever. Rows never shift. That property is the entire justification for splitting storage from presentation.
3. **One-way only** (FR-25). No path reads ticket data back from the sheet.
4. **Idempotent** (FR-30). A retried row updates; it never appends a second copy.
5. **Sync failure never fails encoding** (FR-29).
6. Denormalization happens **at the boundary**. IDs stay in Postgres.

### Watch-outs
- Sheets allows ~60 writes/min/user. Batch 100 rows per call — matters most at backfill.
- The `Tickets` tab is a QUERY view and therefore read-only. **OPEN-3.**

### Tests that gate merge
- **Idempotency:** run the same outbox row twice → one sheet row
- **Isolation:** break the Google credentials → encoding still succeeds
- **Row identity:** insert a ticket at the top, then update an older ticket → the correct row changes
- Rate-limit 429 → backoff, retry, eventual success
- 5 failures → FAILED + surfaced in Bull Board

---

## M9 — Analytics

**Realizes:** FR-17–24

### Contract
Read-only aggregates over Postgres. No writes.

### Design

| FR | Metric | Bucket by |
|---|---|---|
| FR-17 | Volume | `date` |
| FR-18–20 | By department / technician / category | `date` |
| FR-21 | **Problems solved** | **`closed_at`** |
| FR-22 | Open vs Ongoing vs Closed | current status |
| FR-23 | **First-time fix rate** | `status='Closed' AND ongoing_at IS NULL` |
| FR-24 | Ongoing ageing | `now() - ongoing_at` |

### Invariants
1. **FR-21 buckets by `closed_at`, not `date` and not `updated_at`.** Editing a remark on a ticket closed last month would otherwise move it into this month's figures. Bucketing by `date` would credit the fix to the week the problem was *reported*.
2. **FR-17 counts tickets, not distinct problems.** Closed is terminal, so a printer failing four times is four rows. That is correct — recurrence becomes visible — but no chart may be labelled as a count of problems.
3. `ongoing_at IS NULL` on a Closed ticket **is** the first-time-fix signal. No extra column, no flag to keep in sync.

### Watch-outs
- **No Redis cache, no materialized views initially.** At tens of tickets/day the table is in Postgres's buffer cache and a cache round-trip can be slower than the query. Ladder: add the index → cache the response → materialized view refreshed by a BullMQ repeatable job. Cache invalidation bugs are far harder to find than slow queries.

### Tests that gate merge
- A ticket closed in month N, remark edited in month N+1 → still counted in month N
- First-time fix excludes tickets that passed through Ongoing

---

## Cross-cutting rules

1. **One transaction boundary: `TicketService`.** Nothing beneath it opens its own.
2. **The database enforces invariants, not just the app.** `UNIQUE (sequence_scope, sequence_number)`, `UNIQUE (name_normalized)`. Code is the first line; constraints are the last.
3. **Nothing is deleted.** No ticket, no audit row, no lookup. `is_active` and status instead.
4. **Denormalize only at the sheet boundary.**
5. **Three statuses.** Open, Ongoing, Closed. Adding a fourth means revisiting `07`, M5, and M9 together.

---

## Where the specs stop

These modules are specified against a design with **four unanswered questions** and one
unspecified artifact. Nothing here closes them:

| | Blocks |
|---|---|
| **OPEN-1** numbering scope | M3 config (not its structure) |
| **OPEN-2** dashboard access for IT Staff | M1 matrix row |
| **OPEN-3** does anyone hand-edit the sheet | M8 approach — fallback is +3 days |
| **OPEN-4** lookup lists | M2 seed data, M9 grouping |
| Backfill mapping artifact | Deferred to v1.1 with the backfill itself |

A module spec makes implementation unambiguous. It does not make an unanswered question
answered.

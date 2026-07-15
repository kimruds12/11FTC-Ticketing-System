# 11FTC Ticketing Management System — System Design & Architecture

**Revision 4.** Companion to **`11FTC_SRS_Rev3.md`** (now at rev 4), which is now the authoritative
requirements document. Requirement IDs (FR-n) and open items (OPEN-n) below refer to it.

> **What changed in rev 4 — a correction**
>
> The department's real ticket process came to light: **three statuses (Open, Ongoing,
> Closed), and work happens before the ticket does.** IT fixes the concern, then
> records it; Ongoing means "couldn't finish now". Revisions 1–3 modelled a five-stage
> assign → resolve → close queue that has never existed here, plus a Voided status I
> invented. All of that is gone. §4 (analytics) is rebuilt; `07` and `08` were
> rewritten from scratch; `08-sequence-assign-resolve.d2` is now
> **`08-sequence-ticket-lifecycle.d2`**.
>
> **What changed in rev 3 (retained for history)**
>
> The SRS was reconciled (rev 3) and is now the single authoritative spec — the two
> documents no longer contradict each other. Design decisions previously living only
> here were back-ported into it; four items that require an 11FTC decision are tracked
> in its §12 Open Items Register rather than answered by assumption. Role naming here
> now follows SRS §6C (the `VIEWER` role was mine, not the SRS's, and is gone).
>
> **What changed in rev 2 and why (retained for history)**
>
> The IT team's spreadsheet is ordered **newest-first** — each new ticket is
> inserted at the top. This was not in the SRS and it invalidated part of rev 1:
> top-insertion shifts every existing row down by one, so the `sheet_row_number`
> rev 1 told you to store goes stale immediately, and a retry or status update
> would write to the wrong ticket's row. §6 is rewritten around that.
>
> The numbering scope (per-date vs per-year) is **still unresolved**. Rather than
> guess, `TicketSequence` is now keyed by a generic `scope_key`, so both schemes
> run the same code and the decision costs a config value instead of a migration.
> See §3 — this still needs a real answer before go-live.

## Diagram register

**Requirements**

| File | Purpose |
|---|---|
| `11FTC_SRS_Rev3.md` | Authoritative requirements. FR-n and OPEN-n IDs below refer to it. |
| `12-traceability-matrix.md` | FR → use case → diagram map, open items, and unauthorized proposals. |

**Structural — C4 (Structurizr DSL → https://playground.structurizr.com/)**

| File / view | Diagram | Covers |
|---|---|---|
| `workspace.dsl` → SystemContext | System context | Actors and external systems |
| `workspace.dsl` → Containers | Container | Runtime building blocks |
| `workspace.dsl` → ApiComponents | Component (C4) | Inside the Application API |
| `workspace.dsl` → ProductionDeployment | Deployment | Production topology |

**Analysis & design — D2 (https://play.d2lang.com/, layout engine **ELK**)**

| File | Diagram | Covers |
|---|---|---|
| `04-use-case.d2` | **Use case** | Actors, use cases, «include»/«extend», §3.3 boundaries |
| `05-dfd-context.d2` | **DFD Level 0** | Context diagram — system as one process |
| `06-dfd-level1.d2` | **DFD Level 1** | 9 processes, 7 data stores, all flows |
| `01-erd.d2` | **ERD** | Physical schema, keys, constraints |
| `11-class-diagram.d2` | **Class** | Domain model, entities, services, enums |
| `10-component.d2` | **Component** | D2 rendering of the C4 component view |
| `07-ticket-state-machine.d2` | **State transition** | Open / Ongoing / Closed |
| `02-ticket-number-sequence.d2` | **Sequence** | Encode ticket + number allocation |
| `08-sequence-ticket-lifecycle.d2` | **Sequence** | Encode-and-close, and Ongoing → Closed |
| `09-sequence-sync-worker.d2` | **Sequence** | Worker → Google Sheets |
| `03-sheets-sync.d2` | **Data flow** | Sync architecture, outbox, `_raw` tab |

> **Component appears twice on purpose.** `workspace.dsl` gives you the C4 version;
> `10-component.d2` gives you the same decomposition in the boxes-and-arrows style
> most academic templates expect. Same design, two renderings — **if you change one,
> change the other**, or you've recreated the exact problem SRS rev 3 just fixed.

> **`dagre` will mangle these.** Switch the playground's layout engine to **ELK**.
> The `sql_table` and `class` shapes especially.

> **Diagram labels carry no requirement IDs.** They were removed — an oval reading
> `Manage Lookups (§6A, §6B) [OPEN-4]` is unreadable to the stakeholder a use case
> diagram is drawn for. Traceability lives in `12-traceability-matrix.md`. The only
> encoding left in the diagrams is colour: **amber means the element depends on an
> open item**, and each diagram's legend says so.

---

## 1. Architectural drivers

The four stated requirements map to four distinct architectural concerns:

| Requirement | Concern | Design response |
|---|---|---|
| Ticket data encoding | Correctness under concurrent writes, and matching a work-first process | Transactional number allocation via a locked `TicketSequence` row; status settable at creation |
| Daily/weekly/monthly analytics | Query shape | Event timestamps (`ongoing_at`, `closed_at`) + indexed aggregates, cached |
| Dynamic employee input | Data quality | Normalized-name uniqueness + resolve-or-create in one service |
| Google Sheets integration | Reliability across a network boundary, and stable row identity in a newest-first sheet | Transactional outbox + async worker + append-only raw tab |

Everything else in the architecture exists to serve one of these four.

## 2. Architecture style

**A modular monolith with one background worker.** Not microservices.

This is an internal IT ticketing tool. Realistic volume is tens of tickets per day and a handful of concurrent users. Splitting this into services would add network hops, distributed transactions, and deployment complexity in exchange for scaling headroom you will never use — and it would make the outbox pattern (which depends on the ticket write and the outbox write sharing a transaction) considerably harder.

The one process that *is* separated is the Sync Worker, and for a specific reason: the Google Sheets API is a slow, rate-limited, externally-owned dependency. If a sheet write happened inside the HTTP request, every ticket save would inherit Google's latency and every Google outage would look like your system being down.

**Containers** (see the Structurizr container view):

- **Web Application** — Next.js. Ticket forms, queue view, employee management, dashboard.
- **Application API** — REST. All business logic. Laravel or NestJS both fit; pick based on what your team ships fastest.
- **Sync Worker** — drains the outbox, talks to Sheets.
- **PostgreSQL** — the system of record.
- **Redis** — job queue + dashboard cache.

## 3. The ticket number problem (the hardest part of this system)

### 3.1 Open question: what is the sequence scoped to?

The SRS says per-date ("start at 001 when no ticket exists for the selected date", "unique per date"). The example numbers say otherwise — `IT-2026-0174` does not look like a counter that resets to 001 every morning.

You can settle this in five seconds by scrolling the real sheet:

- **Date-scoped** → each date block restarts, so reading downward you'd see `003, 002, 001` then `005, 004` — the numbers sawtooth at every date boundary.
- **Year-scoped** → one unbroken descending run straight through the date boundaries.

Until then the design keys `TicketSequence` on a generic `scope_key`:

| Scheme | `scope_key` | Example `ticket_no` |
|---|---|---|
| Date-scoped | `'2026-07-15'` | `IT-2026-0715-001` |
| Year-scoped | `'2026'` | `IT-2026-0174` |

Same table, same lock, same code path — the generator just formats the key differently. Switching later is a config change plus a backfill, not a migration. **Do confirm before go-live**, because the two schemes behave differently when backdating: date-scoped continues that date's run, while year-scoped hands out the next global number, so a backdated ticket can end up with a *higher* number than tickets dated after it. That's fine, but the IT team should expect it.

### 3.2 The concurrency problem (settled either way)

The naive implementation is:

```sql
SELECT MAX(sequence_number) + 1 FROM tickets WHERE sequence_scope = $1;
```

This is a lost-update race. Two IT staff encoding at the same moment both read `20`, both write `21`, and your uniqueness rule is broken. It will pass every manual test and fail in production the first busy morning.

The fix is a single atomic upsert against a dedicated sequence table, executed inside the same transaction as the ticket insert:

```sql
INSERT INTO ticket_sequence (scope_key, last_sequence, updated_at)
VALUES ($1, 1, now())
ON CONFLICT (scope_key)
DO UPDATE SET last_sequence = ticket_sequence.last_sequence + 1,
              updated_at = now()
RETURNING last_sequence;
```

`ON CONFLICT DO UPDATE` takes a row lock. The second transaction blocks until the first commits, then reads the updated value. Backdating needs no special case — the key is derived from the date being encoded, not from today.

Back this with a database constraint so the invariant survives any future code path:

```sql
ALTER TABLE tickets ADD CONSTRAINT uq_ticket_seq
  UNIQUE (sequence_scope, sequence_number);
```

Gaps are possible if a transaction rolls back after allocating. That is the correct trade — a gap is cosmetic, a duplicate is a data integrity failure. If gaps are genuinely unacceptable to the IT team, say so early, because gap-free sequences require serializing all ticket creation.

## 4. Analytics model

The dashboard needs daily, weekly, and monthly figures — and, now that the process is
understood, two questions the old model couldn't ask.

**Explicit lifecycle timestamps.** `updated_at` records when the row last changed, not
when the work finished; add a remark to a ticket closed last month and it silently
moves into this month's numbers. So `closed_at` is set once, on entry to Closed, and
`ongoing_at` once, on first entry to Ongoing.

Those two columns carry more than they look like. **`ongoing_at IS NULL` on a Closed
ticket means the concern was fixed on the spot** — no extra column, no flag to keep in
sync. That is the department's most meaningful metric, and it exists for free.

```sql
-- Volume by period (by reported date)
SELECT date_trunc('week', date) AS bucket, count(*)
FROM tickets
WHERE date BETWEEN :from AND :to
GROUP BY 1 ORDER BY 1;

-- Problems solved by period (by closed_at, NOT by date)
SELECT date_trunc('week', closed_at) AS bucket, count(*)
FROM tickets
WHERE closed_at IS NOT NULL AND closed_at BETWEEN :from AND :to
GROUP BY 1 ORDER BY 1;

-- First-time fix rate
SELECT count(*) FILTER (WHERE ongoing_at IS NULL)::numeric
       / nullif(count(*), 0) AS first_time_fix_rate
FROM tickets
WHERE status = 'Closed' AND closed_at BETWEEN :from AND :to;

-- Ongoing ageing — what has been outstanding too long
SELECT ticket_no, date, ongoing_at,
       now() - ongoing_at AS outstanding_for
FROM tickets
WHERE status = 'Ongoing'
ORDER BY ongoing_at;

-- Top issue categories
SELECT m.label, count(*)
FROM tickets t JOIN main_issue_category m USING (main_issue_id)
WHERE t.date BETWEEN :from AND :to
GROUP BY 1 ORDER BY 2 DESC;
```

**Two traps worth naming.**

*Volume counts tickets, not problems.* Since Closed is terminal and a recurrence is a
new ticket, a printer that fails four times is four rows. That's the right
representation — recurrence becomes visible instead of hidden inside one ticket's
history — but nobody should read weekly volume as a count of distinct problems.

*"Solved this week" and "reported this week" are different sets.* Most tickets are
encoded already Closed, so for them `date` and `closed_at` nearly coincide. Ongoing
tickets are exactly the ones where they diverge, and those are the interesting ones.
Bucketing solved-work by `date` would quietly credit the fix to the week the problem
was reported.

At your volume, indexed queries with a 5-minute Redis cache are enough. **Don't build
materialized views yet** — that solves a problem you don't have. Revisit if a query
exceeds ~500 ms.

One structural change enables the grouping: `main_issue` must be a **foreign key to a
lookup table**, not free text. Free text means "Printer", "printer", and "Printer
Issue" become three categories and every chart becomes noise.

## 5. Dynamic employee input

The ticket form has a combobox: type a name, pick an existing employee or create one inline. The risk is obvious — "Juan Dela Cruz", "juan dela cruz", and "Juan  Dela Cruz" become three employees, and your per-department analytics fragment.

Guard it at two levels:

1. **Database** — a `name_normalized` column (`lower(trim(regexp_replace(name, '\s+', ' ', 'g')))`) with a `UNIQUE` constraint.
2. **UI** — search-as-you-type showing existing matches before offering "Create new employee". Most duplicates are prevented by simply showing the user that the record already exists.

Department should likewise be a lookup table, for the same reason as `main_issue`.

## 6. Google Sheets integration

Detail is in `03-sheets-sync.d2`.

### 6.1 The newest-first problem

The IT team's sheet displays newest ticket at the top. That single fact breaks the obvious implementation in a way that is easy to miss in testing:

- `spreadsheets.values.append` writes to the **bottom**. Wrong end.
- Inserting at the top **shifts every row below it down by one**. So any row index you stored is wrong the moment the next ticket is encoded.

The second point is the dangerous one. A status update or a retried sync would look successful and quietly overwrite a *different ticket's* row. You'd discover it weeks later when someone notices a resolved ticket has another employee's remarks on it. Rev 1 of this document stored `sheet_row_number` and had exactly this bug.

Note that this is a *presentation* preference creating a *storage* hazard. Which points at the fix.

### 6.2 The fix: separate storage from presentation

- The worker appends, **only ever appends**, to a hidden `_raw` tab. Row N stays row N forever, so a cached row index stays valid indefinitely.
- The team's visible `Tickets` tab becomes a QUERY view over `_raw`:

```
=QUERY(_raw!A2:I, "select * where A is not null order by A desc, B desc", 0)
```

They still see newest-first. Nothing about how they read the sheet changes. Meanwhile row identity is stable, and the sheet gains protection against accidental overwrites for free.

**Raise this trade-off with the IT team before you build it:** a QUERY output range is computed, which makes the `Tickets` tab read-only. If anyone currently types remarks directly into the sheet, that workflow moves into the app. That's arguably the point — it's what "the database is the system of record" means once it stops being a sentence in a document — but it changes someone's daily habit, and it should not arrive as a surprise during UAT.

**If they genuinely must keep hand-editing that tab**, the fallback is `InsertDimensionRequest` at index 1 plus Sheets **developer metadata** pinned to each row. Metadata survives row shifts, which is exactly what it exists for. More API calls and more moving parts, same correctness. What you must not do is fall back to storing a bare row index.

### 6.3 Rules that carry over from rev 1

**The database is the system of record; the sheet is a mirror.** The SRS already says this — hold the line on it. The moment someone can edit the sheet and have it flow back, you own a conflict resolution problem with no rules to resolve it by.

**Transactional outbox, not a direct API call.** If you call Sheets inside the request handler and it fails after the DB commit, you have a ticket that will never reach the sheet and nothing that knows it. Writing the outbox row in the same transaction makes "ticket exists" and "sync is pending" atomically true together.

**Idempotent writes.** `row_key` holds the ticket_no and identifies the row by content, not position. A retry updates the same row instead of appending a duplicate. `raw_row_number` is only a cache of where that row was found in `_raw` — safe precisely because `_raw` is append-only.

**Google Cloud Console setup** (concrete steps):
1. Create a project → **APIs & Services → Enable APIs** → enable **Google Sheets API**.
2. **IAM & Admin → Service Accounts** → create one → **Keys** → add a JSON key.
3. Open the IT tracker spreadsheet → **Share** → add the service account's `...iam.gserviceaccount.com` email as **Editor**.
4. Create the `_raw` tab, hide it, and protect its range so only the service account writes.
5. Store the JSON key in your secret manager — never in the repo. In production, prefer Workload Identity Federation over a downloaded key file.

**Rate limits**: roughly 60 write requests per minute per user. Batch with `spreadsheets.values.batchUpdate` — 100 rows in one call, not 100 calls. This matters most during the historical backfill, which should run through the same outbox path as live traffic rather than a one-off script.

## 7. Audit log

Write audit entries at the **application layer**, not via database triggers. Triggers cannot see `updated_by` — the acting user lives in the HTTP session, not in the database connection. Emit one row per changed field, inside the ticket's transaction.

## 8. Gaps — status against SRS rev 3

Rev 1 of this document listed nine gaps. SRS rev 3 resolves five of them in the
specification itself and converts four into tracked open items. Nothing here is
"solved" by having been written down in a design doc — a gap closes when the
authoritative spec says something true and complete about it, or when a named person
at 11FTC makes a decision.

| # | Gap | Status | Where |
|---|---|---|---|
| 2 | `User` referenced but never defined | **Closed** | SRS §6C |
| 5 | No resolution timestamps | **Closed** | SRS §5 (`ongoing_at`, `closed_at`) |
| 6 | No soft-delete / void path | **Withdrawn** | Void was never real. SRS FR-9: tickets are corrected by editing, never deleted. |
| 8 | No SLA or priority field | **Closed by deferral** | SRS §11 — a recorded decision, not an oversight |
| 9 | Sheet sort order undocumented | **Closed** | SRS FR-25 |
| 4 | `main_issue` / `department` free text | **Structure closed, content open** | SRS §6A, §6B — **OPEN-4**: the actual lists must come from the IT team |
| 1 | Numbering scope unconfirmed | **Tracked** | SRS §8 — **OPEN-1**. Non-blocking via `scope_key`; blocks go-live |
| 3 | Roles / permissions | **Mostly settled** | SRS §3.3. Closing is settled by the process itself; **OPEN-2** is now dashboard access only |
| 7 | Sync direction / hand-editing | **Half closed** | SRS FR-22 states one-way. **OPEN-3**: whether anyone hand-edits today is still unanswered |

The four remaining items share a property worth noticing: none of them can be
resolved by thinking harder about the design. They are facts about how 11FTC actually
works, and the only way to get them is to ask. OPEN-1 and OPEN-4 are answered by
looking at the existing sheet; OPEN-2 and OPEN-3 by talking to the IT team.

## 9. Suggested build order

1. **Clear the Open Items Register** (SRS §12). OPEN-1 and OPEN-4 need someone to open the sheet; OPEN-2 and OPEN-3 need a ten-minute conversation. All four are cheap now and expensive after the schema is populated.
2. Schema + migrations + the lookup tables (blocked on OPEN-4 for contents, not for structure).
3. Auth + RBAC per the SRS §3.3 permission matrix.
4. Ticket encoding with the sequence generator — write a concurrency test that fires 50 simultaneous creates against one scope and asserts 50 distinct numbers. This test is the whole reason §3.2 exists; don't skip it because the happy path passes.
5. Audit log.
6. `_raw` tab + QUERY view on a **copy** of the real sheet first. Then outbox + worker. Then backfill history through the same path.
7. Dashboard.

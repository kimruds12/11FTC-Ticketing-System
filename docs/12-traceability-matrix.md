# 11FTC Ticketing Management System
# Requirements Traceability Matrix

Maps every requirement in `11FTC_SRS_Rev3.md` to the use case that realizes it and the
diagrams that specify it.

This document exists because diagram labels are not the place for requirement IDs. A use
case diagram is read by stakeholders; an oval reading `Manage Lookups (§6A, §6B) [OPEN-4]`
is unreadable to the audience it was drawn for. Traceability belongs in a table.

---

## 1. Diagram key

| Code | File | Diagram |
|---|---|---|
| UC | `04-use-case.d2` | Use case |
| DFD0 | `05-dfd-context.d2` | Data flow — context |
| DFD1 | `06-dfd-level1.d2` | Data flow — level 1 |
| ERD | `01-erd.d2` | Entity relationship |
| CLS | `11-class-diagram.d2` | Class / domain model |
| CMP | `10-component.d2` | Component |
| STM | `07-ticket-state-machine.d2` | State transition |
| SQ1 | `02-ticket-number-sequence.d2` | Sequence — encode ticket |
| SQ2 | `08-sequence-ticket-lifecycle.d2` | Sequence — encode-and-close, Ongoing → Closed |
| SQ3 | `09-sequence-sync-worker.d2` | Sequence — sync worker |
| SYNC | `03-sheets-sync.d2` | Sync architecture |
| C4 | `workspace.dsl` | Context / container / component / deployment |

---

## 2. Functional requirements → use cases → diagrams

### 2.1 Ticket Management (SRS §4.1)

| FR | Requirement | Use case | Diagrams |
|---|---|---|---|
| FR-1 | Three statuses: Open, Ongoing, Closed | Encode / Update / Mark Ongoing / Close Ticket | UC, STM, ERD, CLS |
| FR-2 | Encode directly in any status; form defaults to Closed | Encode Ticket | UC, STM, SQ1, SQ2, DFD1 (2.0) |
| FR-3 | Search and filter tickets | Search and Filter Tickets | UC, CMP |
| FR-4 | Auto-generate ticket numbers | Generate Ticket Number «include» | UC, SQ1, ERD, CLS, DFD1 (3.0) |
| FR-5 | Encode for a past date | Encode Ticket | UC, SQ1, STM |
| FR-6 | Record changes in Audit Log | View Ticket History | UC, DFD1 (6.0), ERD |
| FR-7 | Set `ongoing_at` / `closed_at` once, on transition | Mark Ongoing / Close Ticket | STM, SQ2, ERD, CLS |
| FR-8 | Closed is terminal; recurrence = new ticket | — | STM |
| FR-9 | No delete or void; correct by editing | Update Ticket | STM, ERD, CLS |

### 2.2 Employee Management (SRS §4.2)

| FR | Requirement | Use case | Diagrams |
|---|---|---|---|
| FR-10 | Register employees | Manage Employees | UC, DFD1 (9.0) |
| FR-11 | Update employee information | Manage Employees | UC, DFD1 (9.0) |
| FR-12 | Maintain employee records | Manage Employees | UC, ERD |
| FR-13 | **Create employee inline from ticket form** | Resolve or Create Employee «include» | UC, SQ1, DFD1 (4.0), CLS |
| FR-14 | Search employees as the user types | Resolve or Create Employee | UC, CMP, CLS |
| FR-15 | Prevent duplicates from casing/spacing | Resolve or Create Employee | ERD (`name_normalized`), CLS (`normalize()`) |
| FR-16 | Deactivate without deleting history | Manage Employees | ERD (`is_active`), CLS |

### 2.3 Dashboard Analytics (SRS §4.3)

| FR | Requirement | Use case | Diagrams |
|---|---|---|---|
| FR-17 | Daily / weekly / monthly statistics | View Dashboard | UC, DFD1 (8.0) |
| FR-18 | Tickets by department | View Dashboard | ERD (`department_id` FK), DFD1 (D7) |
| FR-19 | Tickets by technician | View Dashboard | ERD (`assigned_to` → User), CLS |
| FR-20 | Tickets by main issue category | View Dashboard | ERD (`main_issue_id` FK), DFD1 (D7) |
| FR-21 | Problems solved per period, by `closed_at` | View Dashboard | ERD (`closed_at`), STM |
| FR-22 | Open vs Ongoing vs Closed counts | View Dashboard | UC, STM |
| FR-23 | First-time fix rate (`ongoing_at IS NULL`) | View Dashboard | STM, ERD, CLS (`isFirstTimeFix()`) |
| FR-24 | Ongoing ticket ageing | View Dashboard | STM, ERD (`ongoing_at`) |

### 2.4 Google Sheets Synchronization (SRS §4.4)

| FR | Requirement | Use case | Diagrams |
|---|---|---|---|
| FR-25 | One-way sync: DB → sheet | Synchronize to Sheet | DFD0 (no return flow), SYNC, C4 |
| FR-26 | Export using existing columns | Synchronize to Sheet | SYNC, SQ3 |
| FR-27 | Resolve FKs to names at export | Synchronize to Sheet | SQ3, CMP (`SheetRowProjector`) |
| FR-28 | Preserve newest-first display | Synchronize to Sheet | SYNC (`_raw` + QUERY), SQ3, CMP (`RowLocator`) |
| FR-29 | Sync failure must not block encoding | Synchronize to Sheet | SQ1, SQ3, SYNC, C4 |
| FR-30 | Idempotent writes | Synchronize to Sheet | SQ3, ERD (`row_key`) |
| FR-31 | Enqueue sync in the same transaction | Enqueue Synchronization «include» | SQ1, SQ2, ERD, CLS |
| FR-32 | Backfill historical rows | Backfill History | UC, SYNC |

### 2.5 Audit Logging (SRS §4.5)

| FR | Requirement | Use case | Diagrams |
|---|---|---|---|
| FR-33 | One entry per changed field | Write Audit Entry «include» | SQ2, ERD, DFD1 (6.0) |
| FR-34 | Written in the same transaction | Write Audit Entry «include» | SQ1, SQ2 |
| FR-35 | Immutable | Write Audit Entry «include» | ERD, CMP |

---

## 3. Use cases → SRS sections

| Use case | Actor(s) | SRS |
|---|---|---|
| Encode Ticket | IT Staff, Administrator | §4.1 FR-1, FR-5 |
| Update Ticket | IT Staff, Administrator | §4.1 FR-1 |
| Assign Ticket | IT Staff, Administrator | §4.1 FR-1 |
| Close Ticket | IT Staff, Administrator | §4.1 FR-1, FR-7 |
| Mark Ticket Ongoing | IT Staff, Administrator | §4.1 FR-1, FR-7 |
| Search and Filter Tickets | IT Staff, Administrator | §4.1 FR-3 |
| View Ticket History | IT Staff, Administrator | §4.1 FR-6 |
| Generate Ticket Number | «include» — no actor | §8, §9 |
| Resolve or Create Employee | «include» — no actor | §4.2 FR-11–13 |
| Write Audit Entry | «include» — no actor | §4.5, §7 |
| Enqueue Synchronization | «include» — no actor | §4.4 FR-31, §9A |
| Authenticate | «include» — no actor | §3 |
| Manage Employees | Administrator | §4.2 FR-10–12, FR-16, §6 |
| Manage Users | Administrator | §3, §6C |
| Manage Lookups | Administrator | §6A, §6B — **OPEN-4** |
| Configure Synchronization | Administrator | §4.4 FR-25 |
| View Dashboard | Administrator, **IT Staff (OPEN-2)** | §3.3, §4.3 |
| Generate Report | Administrator | §2 |
| Synchronize to Sheet | none — system-triggered | §4.4 FR-25–32 |
| Backfill History | Administrator | §4.4 FR-32 |

---

## 4. Entities → SRS sections

| Entity | SRS | Diagrams |
|---|---|---|
| Ticket | §5 | ERD, CLS, STM |
| Employee | §6 | ERD, CLS |
| Department | §6A | ERD, CLS |
| MainIssueCategory | §6B | ERD, CLS |
| User | §6C | ERD, CLS |
| AuditLog | §7 | ERD, CLS |
| TicketSequence | §9 | ERD, CLS, SQ1 |
| SyncOutbox | §9A | ERD, CLS, SQ3, SYNC |

---

## 5. Open items → affected artifacts

Amber elements in the diagrams correspond to rows in this table. Nothing else is amber.

| ID | Item | Diagrams affected | Blocks |
|---|---|---|---|
| **OPEN-1** | Numbering scope: date-scoped or year-scoped | SQ1, ERD (`scope_key`), CLS (`NumberingScheme`) | Go-live |
| **OPEN-2** | May IT Staff view the dashboard? (Closing is settled — the process answers it) | UC (*View Dashboard* — amber) | Go-live |
| **OPEN-3** | Does anyone hand-edit the sheet today? | SYNC, SQ3 | Design §6 build |
| **OPEN-4** | Supply department and main issue category lists | UC (*Manage Lookups* — amber), DFD1 (D7), ERD, CLS | FR-18, FR-20 |

---

## 5b. Implementation traceability (FR → module → doc → gating test → status)

This is the alignment backbone: every requirement resolves down to the module that
realizes it, the implementation guide that specifies *how*, the test that gates its merge,
and a status. An FR with no test row is a visible gap. `pnpm check:traceability` fails the
build if any SRS FR is missing here or any linked doc no longer exists.

**Status legend:** `scaffold` = folders/contracts exist, no logic yet · `CI-enforced` =
also guarded by a pipeline check · `gate-red` = the gating test exists and fails on purpose
until the module lands.

| FR | Module | Implementation guide | Gating test | Status |
|---|---|---|---|---|
| FR-1 | M5 | [M5-ticket.md](implementation/M5-ticket.md) | transition matrix; encode-as-status | scaffold |
| FR-2 | M5 | [M5-ticket.md](implementation/M5-ticket.md) | encode Closed → `closed_at` set, one tx | scaffold |
| FR-3 | M5 | [M5-ticket.md](implementation/M5-ticket.md) | list/filter by each facet | scaffold |
| FR-4 | M3 | [M3-numbering.md](implementation/M3-numbering.md) | 50 concurrent → 50 distinct | gate-red |
| FR-5 | M3, M5 | [M3-numbering.md](implementation/M3-numbering.md) | backdate uses that date's scope | gate-red |
| FR-6 | M6 | [M6-audit.md](implementation/M6-audit.md) | history read for a ticket | scaffold |
| FR-7 | M5 | [M5-ticket.md](implementation/M5-ticket.md) | `ongoing_at`/`closed_at` set once | scaffold |
| FR-8 | M5 | [M5-ticket.md](implementation/M5-ticket.md) | any transition out of Closed → rejected | scaffold |
| FR-9 | M5 | [M5-ticket.md](implementation/M5-ticket.md) | no DELETE route; `check:no-delete` | CI-enforced |
| FR-10 | M2 | [M2-master-data.md](implementation/M2-master-data.md) | register employee | scaffold |
| FR-11 | M2 | [M2-master-data.md](implementation/M2-master-data.md) | update employee | scaffold |
| FR-12 | M2 | [M2-master-data.md](implementation/M2-master-data.md) | maintain records | scaffold |
| FR-13 | M4 | [M4-employee.md](implementation/M4-employee.md) | inline create in encode tx | scaffold |
| FR-14 | M4 | [M4-employee.md](implementation/M4-employee.md) | search-as-you-type surfaces matches | scaffold |
| FR-15 | M4 | [M4-employee.md](implementation/M4-employee.md) | 3 casings → one row | scaffold |
| FR-16 | M2 | [M2-master-data.md](implementation/M2-master-data.md) | deactivate keeps history readable | scaffold |
| FR-17 | M9 | [M9-analytics.md](implementation/M9-analytics.md) | volume by period | scaffold |
| FR-18 | M9 | [M9-analytics.md](implementation/M9-analytics.md) | by department | scaffold |
| FR-19 | M9 | [M9-analytics.md](implementation/M9-analytics.md) | by technician | scaffold |
| FR-20 | M9 | [M9-analytics.md](implementation/M9-analytics.md) | by category | scaffold |
| FR-21 | M9 | [M9-analytics.md](implementation/M9-analytics.md) | closed month N, edited N+1 → counts in N | scaffold |
| FR-22 | M9 | [M9-analytics.md](implementation/M9-analytics.md) | status distribution | scaffold |
| FR-23 | M9 | [M9-analytics.md](implementation/M9-analytics.md) | first-time-fix excludes Ongoing | scaffold |
| FR-24 | M9 | [M9-analytics.md](implementation/M9-analytics.md) | ongoing ageing | scaffold |
| FR-25 | M8 | [M8-sync-worker.md](implementation/M8-sync-worker.md) | one-way; no read-back path | scaffold |
| FR-26 | M8 | [M8-sync-worker.md](implementation/M8-sync-worker.md) | existing-columns projection | scaffold |
| FR-27 | M8 | [M8-sync-worker.md](implementation/M8-sync-worker.md) | FK → name/label at boundary | scaffold |
| FR-28 | M8 | [M8-sync-worker.md](implementation/M8-sync-worker.md) | row identity by `row_key` | scaffold |
| FR-29 | M8 | [M8-sync-worker.md](implementation/M8-sync-worker.md) | break creds → encoding still ok | scaffold |
| FR-30 | M8 | [M8-sync-worker.md](implementation/M8-sync-worker.md) | run outbox row twice → one row | scaffold |
| FR-31 | M7 | [M7-outbox.md](implementation/M7-outbox.md) | rollback → no outbox row | scaffold |
| FR-32 | M8 | [M8-sync-worker.md](implementation/M8-sync-worker.md) | backfill via same outbox path | scaffold |
| FR-33 | M6 | [M6-audit.md](implementation/M6-audit.md) | close-with-remarks → 2 rows | scaffold |
| FR-34 | M6 | [M6-audit.md](implementation/M6-audit.md) | audit in same tx as change | scaffold |
| FR-35 | M6 | [M6-audit.md](implementation/M6-audit.md) | no mutate/delete; `check:no-delete` | CI-enforced |

**Decisions behind these:** [ADR-0004](adr/0004-atomic-ticket-numbering.md) (FR-4/5),
[ADR-0005](adr/0005-three-status-terminal-closed-no-delete.md) (FR-1/2/7/8/9),
[ADR-0006](adr/0006-application-level-audit-log.md) (FR-6/33–35),
[ADR-0007](adr/0007-employee-normalized-unique.md) (FR-13–15),
[ADR-0008](adr/0008-analytics-no-cache-initially.md) (FR-17–24),
[ADR-0003](adr/0003-transactional-outbox-append-only-raw-tab.md) (FR-25–32).

---

## 6. Proposals not traceable to a requirement

These appear in the diagrams but no SRS requirement authorizes them. They are design
proposals awaiting confirmation, and should not be read as agreed scope.

| Element | Diagram | Why it exists |
|---|---|---|
| IT Staff → *View Dashboard* | UC | The §3.3 dashboard row is a proposal — see OPEN-2. |

**Withdrawn in rev 4.** These were proposals in earlier revisions, invented against a
workflow the department does not run. They are listed so the record is honest, not
because they are pending.

| Withdrawn | Why it was wrong |
|---|---|
| `Resolved → In Progress` (reopen) | Closed is terminal (FR-8). A recurrence is a new ticket. |
| `Pending → In Progress`, `Assigned`, `In Progress`, `Resolved` | Four states the department has never used. Work happens before the ticket exists. |
| `assigned → assigned` (reassign) | `assigned_to` is a record of who handled the concern, not a workflow stage. |
| `Voided` status | Invented to handle encoding errors. Those are handled by editing (FR-9). |
| IT Staff → *Close Ticket* as an open question | Settled by the process — staff solve and close directly. |

---

## 7. Requirements with no diagram coverage

| SRS | Item | Status |
|---|---|---|
| §11 | SLA monitoring, priority | Deliberately deferred — out of scope for v1 |
| §11 | Email notifications, attachments, AI categorization, predictive analytics | Out of scope |
| §4.4 FR-32 | Historical backfill needs a free-text → lookup-ID **mapping artifact** | **Not yet specified.** Old sheet rows carry free-text department and main issue strings; the new schema needs FK IDs. The mapping is the OPEN-4 curation decision, and it needs to exist as a reviewable artifact rather than as improvisation during a one-off import. Unresolved strings need a defined outcome — bucket as "Uncategorized" or halt the import. |

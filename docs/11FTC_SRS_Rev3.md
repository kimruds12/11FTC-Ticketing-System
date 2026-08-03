# 11FTC Ticketing Management System
# Software Requirements Specification (SRS)

**Revision 4** — corrected to the department's actual ticket process.

> **Reader's note — rev 4 is a correction, not an addition.**
>
> Revisions 1–3 described a five-stage ticket workflow — Pending, Assigned, In
> Progress, Resolved, Closed. **The 11FTC IT department has never used it.** The real
> process has three statuses (Open, Ongoing, Closed) and, more importantly, a
> different shape: **the department solves the concern first and records it after.**
> A ticket is a record of work done, not a queue of work to do. Most tickets are
> encoded already Closed.
>
> Rev 4 rebuilds §4.1, §5, §7, and §8 around that. Three invented statuses are gone;
> so is the Voided status, which was also never real.
>
> Three items remain marked **[OPEN]** — decisions only the 11FTC IT team can make,
> tracked deliberately rather than answered by assumption. Section 12 lists them.

---

## 1. Introduction

### 1.1 Purpose
The 11FTC Ticketing Management System is a web-based application that centralizes IT ticket encoding, monitoring, reporting, and analytics while integrating with the department's existing Google Sheets workflow.

### 1.2 Objectives
- Centralize IT ticket management.
- Maintain compatibility with the existing Google Sheets process.
- Generate dashboard analytics (daily, weekly, monthly).
- Maintain a complete audit trail.
- Automatically generate ticket numbers.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Employee | A staff member who reports an IT concern. Not a system user; does not log in. |
| User | A person with system credentials (IT Administrator or IT Staff). |
| Ticket | A recorded IT concern and its resolution lifecycle. |
| System of record | The relational database. The Google Sheet is a downstream mirror. |
| Encoding | Entering a ticket into the system, possibly for a past date. |
| Open | Logged but not yet attempted. |
| Ongoing | Attempted, but could not be finished at the time. |
| Closed | Solved. Terminal — a recurrence is encoded as a new ticket. |
| First-time fix | A ticket closed without ever having been Ongoing. |

## 2. Scope

**In scope**
- Ticket Management
- Employee Management
- Dashboard Analytics
- Google Sheets Synchronization (one-way, database → sheet)
- Audit Logging
- Reporting

**Out of scope** (see §11)
- SLA monitoring, email notifications, file attachments, AI categorization, predictive analytics
- Sheet → database synchronization

## 3. User Roles

### 3.1 IT Administrator
- Manage employees
- Manage users
- Manage lookup values (departments, main issue categories)
- Configure Google Sheets synchronization
- Encode, update, assign, and close tickets; mark tickets Ongoing
- View reports and analytics

### 3.2 IT Staff
- Encode tickets, including encoding a concern already solved
- Update tickets
- Assign tickets
- Mark tickets Ongoing
- Close tickets
- View ticket history
- View reports and analytics *(see OPEN-2)*

### 3.3 Permission Matrix

| Capability | IT Administrator | IT Staff |
|---|---|---|
| Encode ticket (any status) | Yes | Yes |
| Update ticket | Yes | Yes |
| Assign ticket | Yes | Yes |
| Mark ticket Ongoing | Yes | Yes |
| Close ticket | Yes | Yes |
| View dashboard | Yes | **[OPEN-2]** |
| Create employee inline | Yes | Yes |
| Manage users / lookups / sync config | Yes | No |

> **[OPEN-2] Dashboard access for IT Staff.** Narrowed in rev 4. The question of
> whether IT Staff may close tickets is **settled** — the department's staff solve
> concerns directly and record them as Closed, so closing is their primary action, not
> a privileged one. What remains open is analytics: rev 2 placed reports under
> Administrator only. The matrix above proposes IT Staff may view the dashboard, on
> the grounds that a dashboard nobody on the floor can see is unlikely to be used.
> **That row is a proposal — 11FTC to confirm.**

## 4. Functional Requirements

### 4.1 Ticket Management
- FR-1. Create, update, and close tickets, and mark tickets Ongoing. A ticket carries exactly one of three statuses: **Open**, **Ongoing**, **Closed**.
- FR-2. **Encode a ticket directly in any of the three statuses.** The department solves concerns first and records them after, so a ticket may be created already Closed. The encoding form defaults to Closed. Open and Ongoing are selected at creation only when that is what actually occurred.
- FR-3. Search and filter tickets by date range, status, department, main issue, employee, and assigned technician.
- FR-4. Automatically generate ticket numbers per §8.
- FR-5. Support encoding tickets for a past date.
- FR-6. Record all ticket changes in the Audit Log (§7).
- FR-7. Set `ongoing_at` on first entry to Ongoing and `closed_at` on entry to Closed, at the moment the transition occurs. Each is set once and never recomputed.
- FR-8. **Closed is terminal.** A closed ticket cannot be reopened. A recurring problem is encoded as a new ticket.
- FR-9. **Tickets are never deleted.** There is no void or delete path. A mis-encoded ticket is corrected by editing it, and the Audit Log records the correction. Deletion would leave a gap in the number sequence and orphan a row already written to the sheet.

> **The department's process, stated plainly, because the data model depends on it:**
> IT receives a concern and attempts it directly. If it is solved, the ticket is
> recorded as Closed. If it cannot be finished at that time, it is flagged Ongoing and
> closed later. Open means logged but not yet attempted, and is uncommon.
>
> Revisions 1–3 modelled an assign → resolve → close queue that does not exist here.
> The distinction matters: a system that forces every ticket to start at Open and be
> clicked through to Closed adds three steps to record a fix that already happened,
> which is how a tool gets abandoned in favour of the spreadsheet it replaced.

### 4.2 Employee Management
- FR-10. Register employees.
- FR-11. Update employee information.
- FR-12. Maintain employee records.
- FR-13. **Create a new employee inline from the ticket encoding form**, without leaving the form or interrupting encoding.
- FR-14. When encoding, search existing employees as the user types and surface matches before offering to create a new record.
- FR-15. Prevent duplicate employee records arising from casing or spacing differences (e.g. "Juan Dela Cruz" / "juan dela cruz" / "Juan  Dela Cruz" are one employee).
- FR-16. Deactivate an employee without deleting historical tickets.

> FR-13 restores the original gathered requirement — *"can dynamically input tickets
> with new employees"* — which was absent from rev 2. FR-14 and FR-15 exist because
> FR-13 without them fragments the department analytics required by FR-17.

### 4.3 Dashboard Analytics
- FR-17. Daily, weekly, and monthly ticket statistics, counted by reported date.
- FR-18. Tickets by department.
- FR-19. Tickets by technician.
- FR-20. Tickets by main issue category.
- FR-21. **Problems solved per period**, counted by `closed_at` — not by `updated_at`, and not by reported date.
- FR-22. **Open vs Ongoing vs Closed** counts.
- FR-23. **First-time fix rate** — the proportion of closed tickets that were never Ongoing (`ongoing_at IS NULL`).
- FR-24. **Ongoing ticket ageing** — how long each currently-Ongoing ticket has been outstanding.

> These requirements drive several data model decisions. FR-18 and FR-20 require
> controlled vocabularies rather than free text; FR-19 requires a defined User entity;
> FR-21 requires a close timestamp distinct from `updated_at`.
>
> **FR-23 and FR-24 are new in rev 4 and exist because the process description made
> them visible.** A department that fixes most concerns on the spot has a meaningful
> question — *how often can we?* — and a meaningful risk — *what has been Ongoing too
> long?* Neither was answerable under the old five-stage model, and neither costs an
> extra column: `ongoing_at IS NULL` on a Closed ticket means it was fixed first time.
>
> **A consequence of FR-8 (no reopen) worth stating:** a recurring problem produces
> several tickets rather than one. Volume counts will reflect that, which is correct —
> recurrence becomes visible rather than buried in one ticket's history. But FR-17
> counts *tickets*, not *distinct problems*, and nobody should read it as the latter.

### 4.4 Google Sheets Synchronization
- FR-25. The relational database is the system of record. Synchronization is **one-way: database → sheet**. The system does not read ticket data back from the sheet. *(Closes OPEN in rev 2; see also OPEN-3.)*
- FR-26. Ticket records are exported using the existing spreadsheet columns, unchanged: Date, Ticket No, Employee, Department, Main Issue, Concern, Assigned To, Status, Remarks.
- FR-27. Foreign keys are resolved to display names at export time. `employee_id` becomes the employee name, the assignee list becomes the technician names joined with `/` (`"Kim/Paul"`), `main_issue_id` becomes the category label. IDs are never written to the sheet.
- FR-28. The sheet is displayed **newest-first**: the most recent ticket appears at the top. This ordering must be preserved.
- FR-29. Synchronization is asynchronous. A failure to reach Google must not fail or delay ticket encoding.
- FR-30. Synchronization is idempotent. A retried write updates the existing row for that ticket number; it never creates a duplicate.
- FR-31. Every ticket write enqueues a synchronization record in the same database transaction, so a ticket cannot exist without a corresponding pending sync.
- FR-32. Historical rows already in the sheet are backfilled through the same synchronization path.

> **FR-28 has architectural consequences.** Inserting each new ticket at the top
> shifts every row beneath it down by one, so a stored row index becomes invalid as
> soon as the next ticket is encoded — a later update would write to the wrong
> ticket's row. §6 of the design document separates storage from presentation to
> resolve this: the system appends to a hidden `_raw` tab whose rows never move, and
> the visible tab reproduces the newest-first order via a `QUERY` formula. See OPEN-3.

### 4.5 Audit Logging
- FR-33. Record one entry per changed field, capturing the previous value, the new value, the acting user, and the timestamp.
- FR-34. Audit entries are written in the same transaction as the change they describe.
- FR-35. Audit entries are immutable. No user may edit or delete them.

## 5. Ticket Entity

| Field | Type | Description |
|---|---|---|
| ticket_id | UUID (PK) | Internal unique identifier |
| ticket_no | VARCHAR (UNIQUE) | Generated ticket number. Persisted once; never recomputed. |
| date | DATE | Date reported. May be in the past (FR-5). |
| sequence_scope | VARCHAR (FK) | Scope the number was drawn from. References TicketSequence. See §8. |
| sequence_number | INTEGER | Position within that scope |
| employee_id | UUID (FK) | References Employee |
| main_issue_id | UUID (FK) | References MainIssueCategory (§6B). **Was free-text VARCHAR in rev 2.** |
| concern | TEXT | Detailed concern |
| *(assignment)* | — | **Not a column.** Who handled the concern lives in `ticket_assignees` → `technicians` (rev 5, ADR-0017): an ordered many-to-many, because two-technician work is ~21% of real tickets and most handlers hold no account. Still a record, not a workflow stage — nothing branches on it. |
| created_by | UUID (FK) | References User. Who encoded the ticket. |
| status | ENUM | **Open, Ongoing, Closed** |
| remarks | TEXT | Resolution notes |
| ongoing_at | TIMESTAMP (NULL) | Set once, on first entry to Ongoing. NULL on a Closed ticket means first-time fix (FR-23). |
| closed_at | TIMESTAMP (NULL) | Set once, on entry to Closed. **Required by FR-21.** |
| created_at | TIMESTAMP | Created timestamp |
| updated_at | TIMESTAMP | Last updated |

**Constraints**
- `UNIQUE (sequence_scope, sequence_number)` — enforces §8 rule 4 at the database level, not only in application code.
- `UNIQUE (ticket_no)`

> **Why `closed_at` is separate from `updated_at`.** `updated_at` records when the row
> last changed, not when the work was finished. Editing a remark on a ticket closed
> last month would silently move it into this month's figures. FR-21 is not satisfiable
> without a dedicated timestamp.
>
> **Why there is no `resolved_at`.** Revisions 1–3 had both `resolved_at` and
> `closed_at` because they modelled Resolved and Closed as different states. In this
> department they are the same event — closing *is* solving.
>
> **Why there is no Voided status.** It was never real; it was invented in an earlier
> revision to handle encoding errors. See FR-9 for how those are actually handled.

## 6. Employee Entity

| Field | Type | Description |
|---|---|---|
| employee_id | UUID (PK) | Identifier |
| name | VARCHAR | Employee name, as entered |
| name_normalized | VARCHAR (UNIQUE) | Lowercased, trimmed, whitespace-collapsed. Enforces FR-15. |
| department_id | UUID (FK) | References Department (§6A). **Was free-text VARCHAR in rev 2.** |
| is_active | BOOLEAN | Supports FR-16 |
| created_at | TIMESTAMP | Created |
| updated_at | TIMESTAMP | Updated |

## 6A. Department Entity

| Field | Type | Description |
|---|---|---|
| department_id | UUID (PK) | Identifier |
| name | VARCHAR (UNIQUE) | Department name |
| is_active | BOOLEAN | Retired departments remain linked to historical tickets |

> **[OPEN-4] Controlled vocabularies.** Departments and main issue categories are
> now lookup tables rather than free text, because FR-18 and FR-20 cannot produce
> meaningful charts otherwise — free text turns "Printer", "printer", and "Printer
> Issue" into three separate categories. **The initial contents of both lists must
> come from the 11FTC IT team**, taken from the existing sheet. They are not
> specified here because inventing them would be worse than leaving them blank.

## 6B. MainIssueCategory Entity

| Field | Type | Description |
|---|---|---|
| main_issue_id | UUID (PK) | Identifier |
| label | VARCHAR (UNIQUE) | Category label as shown in the sheet |
| sort_order | INTEGER | Display order in the encoding form |
| is_active | BOOLEAN | Retired categories remain linked to historical tickets |

## 6C. User Entity

| Field | Type | Description |
|---|---|---|
| user_id | UUID (PK) | Identifier |
| email | VARCHAR (UNIQUE) | Login identity |
| full_name | VARCHAR | Name written to the sheet's "Assigned To" column |
| role | ENUM | IT_ADMINISTRATOR, IT_STAFF (§3) |
| is_active | BOOLEAN | Deactivated users retain their ticket history |
| created_at | TIMESTAMP | Created |
| updated_at | TIMESTAMP | Updated |

> Rev 2 referenced `assigned_to` and `updated_by` as foreign keys to a User entity
> the document never defined, and required "tickets by technician" (FR-19) against
> it. This section closes that gap.

## 7. Audit Log

| Field | Type | Description |
|---|---|---|
| audit_log_id | UUID (PK) | Audit identifier |
| ticket_id | UUID (FK) | Related ticket |
| action | ENUM | CREATE, UPDATE, ASSIGN, STATUS_CHANGE, CLOSE |
| field_name | VARCHAR | Modified field |
| previous_value | TEXT | Previous value |
| new_value | TEXT | Updated value |
| updated_by | UUID (FK) | References User (§6C) |
| updated_at | TIMESTAMP | Timestamp |

> Audit entries are written by the application, not by database triggers. A trigger
> cannot see `updated_by` — the acting user exists in the web session, not in the
> database connection.

## 8. Ticket Number Generation

**Business rules**
1. Start the sequence at 001 when no ticket exists for the selected scope.
2. Continue the latest sequence for that scope.
3. Support encoding previous dates.
4. Ensure uniqueness within the scope.
5. Preserve the existing Google Sheets numbering convention.
6. Allocate the number inside the same database transaction as the ticket insert, so that two users encoding simultaneously cannot receive the same number.
7. Gaps may occur if a transaction is rolled back after allocation. This is accepted: a gap is cosmetic, a duplicate is a data integrity failure.

> **[OPEN-1] Numbering scope.** Rules 1–4 above say "scope" rather than "date"
> because the scope is not yet confirmed. Rev 1 and rev 2 both stated per-date
> numbering ("start at 001 for the selected date"), but the sample numbers in rev 1
> (`IT-2026-0174`) are inconsistent with a counter that resets each day.
>
> | Scheme | Scope value | Resulting ticket_no |
> |---|---|---|
> | Date-scoped | `2026-07-15` | `IT-2026-0715-001` |
> | Year-scoped | `2026` | `IT-2026-0174` |
>
> **How to confirm:** open the existing sheet and read the Ticket No column downward.
> Date-scoped numbers restart at every date boundary (…003, 002, 001, then 005, 004…).
> Year-scoped numbers run unbroken straight through the boundaries.
>
> **Behavioural difference when backdating (rule 3):** date-scoped numbering
> continues that date's run; year-scoped numbering issues the next global number, so
> a backdated ticket may carry a *higher* number than tickets dated after it. The IT
> team should be shown this before sign-off.
>
> §9 is designed to support either scheme without a schema change, so this does not
> block development. It must be settled before go-live.

## 9. TicketSequence Entity

| Field | Type | Description |
|---|---|---|
| scope_key | VARCHAR (PK) | `'2026-07-15'` (date-scoped) or `'2026'` (year-scoped). See OPEN-1. |
| last_sequence | INTEGER | Highest number issued for this scope |
| updated_at | TIMESTAMP | Last allocation |

> **Was `sequence_date DATE (PK)` in rev 2.** A generic key lets both candidate
> schemes in OPEN-1 use the same table, the same locking, and the same code. Choosing
> a scheme becomes a configuration value plus a backfill instead of a migration.

## 9A. SyncOutbox Entity

| Field | Type | Description |
|---|---|---|
| outbox_id | UUID (PK) | Identifier |
| ticket_id | UUID (FK) | Ticket to mirror |
| operation | ENUM | UPSERT |
| row_key | VARCHAR | The ticket_no. Locates the sheet row **by content, not position** (FR-28, FR-30). |
| payload | JSONB | Projected sheet row |
| status | ENUM | PENDING, SENT, FAILED |
| attempts | INTEGER | Retry counter |
| raw_row_number | INTEGER (NULL) | Cached row index in the append-only `_raw` tab |
| last_error | TEXT (NULL) | Most recent failure |
| created_at | TIMESTAMP | Enqueued |
| sent_at | TIMESTAMP (NULL) | Successfully written |

> Required by FR-29, FR-30, and FR-31. Writing this row in the ticket's transaction
> is what makes "the ticket exists" and "a sync is pending" atomically true together.

## 10. Database Relationships

```text
Department (1) ----< Employee (1) ----< Ticket >---- (1) MainIssueCategory
                                          |
                          User (1) ----<  |  (created_by)
                                          |
              Technician (1) ----< TicketAssignee >---+   (who handled it, ordered)
                                          |
                          +---------------+---------------+
                          v                               v
                      AuditLog >---- (1) User        SyncOutbox

TicketSequence (scope_key) ----> allocates Ticket.ticket_no
SyncOutbox ----> Google Sheet (Tickets tab, one-way, newest-first)
```

**Indexes**: `tickets(date)`, `tickets(status)`, `tickets(closed_at)`, `tickets(ongoing_at)`, `ticket_assignees(technician_id)`, `sync_outbox(status, created_at)`, `employees(name_normalized)`, `technicians(name_normalized)`.

## 11. Future Enhancements
- SLA monitoring and ticket priority
- Email notifications
- File attachments
- AI ticket categorization
- Predictive analytics

> **SLA is deliberately deferred, and this closes the question.** FR-21 measures
> *whether* a ticket was solved; measuring whether it was solved *on time* requires a
> priority field and a target per priority, neither of which exists. That is a real
> capability gap, and it is an acceptable one for v1 — but it should be a recorded
> decision rather than an oversight.

## 12. Open Items Register

| ID | Item | Owner | Blocks | Section |
|---|---|---|---|---|
| OPEN-1 | Confirm numbering scope: date-scoped or year-scoped | 11FTC IT team | Go-live | §8 |
| OPEN-2 | Confirm dashboard access for IT Staff (the closing question is settled — staff solve and close directly) | 11FTC IT team | Go-live | §3.3 |
| OPEN-3 | Confirm nobody hand-edits the sheet. FR-25 and the `QUERY` view in design §6.2 make the visible tab read-only. If remarks are currently typed directly into the sheet, that workflow moves into the application. | 11FTC IT team | Design §6 build | §4.4 |
| OPEN-4 | Supply the initial department list and main issue category list from the existing sheet | 11FTC IT team | FR-18, FR-20 | §6A, §6B |

## 13. Change Log

| Rev | Change |
|---|---|
| **5** | **Assignment decoupled from accounts (ADR-0017).** `assigned_to` (FK to User) and the `assigned_label` free-text fallback replaced by a **Technician directory** + ordered `TicketAssignee` join. Driven by the real data: two-technician work is 21% of tickets, 74% of handlers held no account, and FR-19 was therefore reporting on 26% of the history while omitting the busiest technician entirely. A technician is an auth-free directory entry like an Employee, resolve-or-created inline during encoding. FR-19 and FR-27 restated; no requirement added or removed. Analytics time series (FR-17, FR-21) gained a `day`/`week`/`month` granularity independent of the window. |
| **4.1** | **Numbering defect fix.** FR-24 was defined twice — "Ongoing ticket ageing" (§4.3) and "One-way sync" (§4.4) — because the rev 4 renumbering shifted §4.4 by the wrong amount. §4.4 is now FR-25–32 and §4.5 is FR-33–35. All downstream citations in the design doc, traceability matrix, module specs, and plan were corrected; several had also been carrying pre-rev-4 numbers. Total: 35 requirements, no gaps, no duplicates. |
| **4** | **Corrected to the department's real process.** Status ENUM rebuilt to Open / Ongoing / Closed; Pending, Assigned, In Progress, Resolved and Voided removed — they were never used. Ticket creation may now enter any status directly, defaulting to Closed (FR-2). `assigned_at` and `resolved_at` replaced by `ongoing_at` and `closed_at` (FR-7). Closed made terminal, no reopen (FR-8). Delete/void path removed (FR-9). `assigned_to` reclassified as a record of who handled the concern rather than a workflow stage. Audit actions RESOLVE and VOID removed. First-time fix rate (FR-23) and Ongoing ageing (FR-24) added — both newly answerable once the process was understood. OPEN-2 narrowed to dashboard access only; the closing question is settled. Requirements renumbered from FR-8 onward. |
| 3 | User, Department, and MainIssueCategory entities defined. `main_issue` and `department` changed from free text to foreign keys (FR-18, FR-20). Lifecycle timestamps added (FR-21). `Voided` status and VOID audit action added (FR-2). Inline employee creation restored (FR-13–FR-15). TicketSequence re-keyed to `scope_key` (OPEN-1). SyncOutbox added (FR-29–FR-31). Sync direction stated explicitly (FR-25). Sheet ordering documented (FR-28). Permission matrix added (§3.3). Malformed tables in §6, §7, §9 repaired. Open Items Register added. |
| 2 | Added Introduction, Scope, User Roles, Functional Requirements, Future Enhancements. |
| 1 | Initial entity definitions and ticket number generation rules. |

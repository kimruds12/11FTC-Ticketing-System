# ADR-0005 — Three statuses, Closed terminal, nothing deleted

**Status:** Accepted · **Realizes:** FR-1, FR-2, FR-7, FR-8, FR-9 · **Diagrams:** STM, ERD

## Context

Revisions 1–3 modelled a five-stage assign→resolve→close queue with a Voided status. The
department's real process is different: **IT fixes the concern first, then records it.**
Forcing every ticket through Open→…→Closed adds steps to record a fix that already
happened — how a tool gets abandoned for the spreadsheet it replaced.

## Decision

- Exactly **three statuses: Open, Ongoing, Closed.** The encoding form defaults to Closed;
  all three are selectable at creation (FR-2).
- **Closed is terminal** (FR-8): no reopen route. A recurrence is a new ticket.
- **Nothing is deleted** (FR-9): no void/delete path. Mis-encodes are corrected by editing;
  the audit log records the change. `is_active`/status instead of deletion everywhere.
- `ongoing_at`/`closed_at` are set once, at transition (FR-7), never recomputed.
- The state machine is enforced **server-side** in `TicketService`, not as a UI hint.

## Consequences

- Deleting would gap the number sequence and orphan a row already sent to the sheet — so
  the no-delete rule is also a data-integrity rule. CI greps for forbidden DELETEs
  (`check:no-delete`, FR-9/FR-35).
- Adding a fourth status means revisiting the state machine, M5, and M9 together.
- `ongoing_at IS NULL` on a Closed ticket is the first-time-fix signal, for free (ADR-0008).

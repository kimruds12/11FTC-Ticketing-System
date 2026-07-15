# Frontend — Ticket detail, edit & history

**Realizes:** FR-1, FR-6, FR-7, FR-8 · **Backend:** M5, M6 · **Route:** `(app)/tickets/[ticketId]`

## Component contract

- `TicketHeader` — number, status, dates (`ongoing_at`, `closed_at` shown once set).
- `TicketActions` — render only the transitions the **server-side** state machine allows.
  A **Closed** ticket shows **no reopen control** (FR-8). Fetch allowed transitions or mirror
  `07-ticket-state-machine.d2` — but the API is the gate, the UI is the hint.
- `EditForm` — edit concern, remarks, assignment, main issue; validated with the shared Zod
  schema. Corrections are edits (there is no delete — FR-9).
- `AuditHistory` — read-only, one entry per changed field (FR-6), showing action, field,
  previous→new, actor, timestamp.

## Data / API

- Server Component reads `GET /tickets/:id` (M5 + history from M6).
- Actions call `PATCH /tickets/:id`, `/assign`, `/ongoing`, `/close` (M5). A 409 means the
  domain rejected the transition — surface it, don't retry blindly.

## States

- Loading, not-found (404), optimistic-but-verified action feedback, 409 illegal-transition
  message, save success.

## RBAC

- Both roles may update/assign/mark-ongoing/close (§3.3).

## Accessibility

- Actions are buttons with clear labels/disabled reasons; history is a semantic list/table;
  edit dialogs manage focus.

## Acceptance criteria

- No reopen control on Closed tickets (FR-8); no delete control anywhere (FR-9).
- Audit history renders one row per changed field (FR-6).
- `ongoing_at`/`closed_at` display as set-once values (FR-7).

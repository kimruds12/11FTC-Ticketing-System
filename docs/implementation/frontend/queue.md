# Frontend — Ticket queue & filters

**Realizes:** FR-3 · **Backend:** M5 (list) · **Route:** `(app)/tickets`

## Component contract

- `TicketFilters` — date range, status, department, main issue, employee, assigned
  technician (FR-3). Filter state lives in the URL (searchParams) so views are shareable and
  survive refresh.
- `TicketTable` — newest-first, paginated. Columns: ticket_no, date, status, employee,
  department, main issue, assigned. Row → detail.
- `StatusBadge` — Open / Ongoing / Closed, using the shared `TicketStatus` enum.

## Data / API

- Server Component reads `GET /tickets` (M5) with the filter params, using the user's
  session. No client-side business logic — the API owns filtering and ordering.
- Types come from `@11ftc/shared/dto/ticket.dto.ts`.

## States

- Loading skeleton, empty ("no tickets match these filters"), error (retry), and a clear
  affordance to reset filters.

## RBAC

- Both roles may view and filter tickets.

## Accessibility

- Filters are labeled form controls; the table has proper headers and a keyboard-navigable
  row-to-detail affordance.

## Acceptance criteria

- FR-3: every listed facet filters correctly and composes; filter state is in the URL.
- Ordering is newest-first and matches the API.

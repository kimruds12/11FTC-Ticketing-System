# Frontend — Encode ticket

**Realizes:** FR-1, FR-2, FR-5, FR-13, FR-14 · **Backend:** M5 (encode), M4 (employee), M3 (number)
**Route:** `(app)/tickets/new`

This is the most important screen — the department lives in it. The process is **fix first,
record after**, so the form must make recording a done fix fast.

## Component contract

- `StatusPicker` — Open / Ongoing / **Closed (default)**. Closed is pre-selected because
  most tickets are encoded already solved (FR-2). Do not bury it.
- `EmployeeCombobox` (FR-13, FR-14) — as the user types, call `GET /employees/search?q=`
  (M4), normalizing `q` with `normalizeName` from `@11ftc/shared` so matches line up with
  what the unique index accepts. **Show existing matches before** the "Create new employee"
  option — surfacing the existing record prevents most duplicates.
- `DateField` — editable, defaults to today, allows past dates (FR-5). The server derives
  the ticket-number scope from this date, not today.
- `MainIssueSelect`, `DepartmentSelect` — from the API lookups (M2); never hard-coded.

## Data / API

- Submit → `POST /tickets` (M5) with the `EncodeTicket` DTO from `@11ftc/shared/dto`.
- Validate the form with the **same Zod schema** the API uses — no divergent client rules.
- The number is allocated server-side (M3); the client never computes or displays a
  predicted number before the response.

## States

- Submitting (disable submit, no double-post), success (toast + link to the new ticket or
  clear-for-next), validation errors inline, employee-search loading/empty, API 4xx surfaced
  near the offending field.

## RBAC

- Both roles may encode (§3.3). No admin gating on this screen.

## Accessibility

- Label every field; the combobox must be keyboard-navigable with proper `aria-activedescendant`
  and announce match counts; focus returns sensibly after inline-create.

## Acceptance criteria

- Defaults to Closed; all three statuses selectable (FR-2).
- Backdating works (FR-5). Inline employee create + match-first search (FR-13/14).
- An illegal combination is still rejected by the API, not just the form.

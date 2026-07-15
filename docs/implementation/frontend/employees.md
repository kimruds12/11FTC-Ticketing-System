# Frontend — Employee management

**Realizes:** FR-10, FR-11, FR-12, FR-16 · **Backend:** M2, M4 · **Route:** `(app)/employees`

## Component contract

- `EmployeeTable` — list with department, active/inactive.
- `EmployeeForm` — register/update (FR-10, FR-11). Name changes still go through the same
  `normalizeName` path so the unique index stays consistent (M4).
- `DeactivateToggle` — retire an employee via `is_active = false` (FR-16). **No delete
  control** — deactivation preserves historical tickets.

## Data / API

- `GET/POST/PATCH /employees` and the lookups (M2). DTOs from `@11ftc/shared/dto/employee.dto.ts`.
- Department options come from the API lookups, never hard-coded (OPEN-4).

## States

- Loading, empty, validation errors (duplicate normalized name surfaced clearly), success.

## RBAC

- **Admin-only** screen (§3.3). Hide from `IT_STAFF` nav; the API enforces it regardless.

## Accessibility

- Labeled forms; the active/inactive state is conveyed by more than color.

## Acceptance criteria

- FR-10/11/12: register, update, maintain employees.
- FR-16: deactivation keeps historical tickets readable; no delete path in the UI.

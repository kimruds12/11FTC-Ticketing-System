# M2 — Master Data

**Realizes:** FR-10–12, FR-16, §6A–C · **Depends on:** M1 · **Risk:** Low
**Folder:** `apps/api/src/master-data/`

## Contract

Owns Department, MainIssueCategory, User, and Employee CRUD. Provides the vocabularies the
encoding form and dashboards depend on.

## Files to create

```
master-data/
├── master-data.module.ts     (exists — scaffold)
├── master-data.service.ts    (exists — scaffold)
├── department.controller.ts  admin-only writes; list is readable to both roles
├── main-issue.controller.ts  same
├── user.controller.ts        admin-only (manage users)
└── dtos in packages/shared    CreateDepartmentDto, etc. (Zod)
```

Employee CRUD lives here too, but the *inline resolve-or-create* path is M4 — keep the
create-form path and the admin path calling the **same** normalize/insert code.

## How it works

- Plain Drizzle reads/writes against `departments`, `main_issue_category`, `users`,
  `employees`. No transaction gymnastics — these are simple CRUD, not the ticket path.
- **No admin console in v1** (deferred). Manage via SQL/seed for now; expose read endpoints
  the web app's dropdowns consume, and the minimal write endpoints RBAC allows.
- `is_active` on every lookup. Retiring = set `is_active = false`.

## Invariants

1. **Retiring a lookup never orphans a historical ticket.** Set `is_active = false`, never
   `DELETE`. A ticket that referenced a now-retired department still renders its name,
   because the row still exists.
2. **Lookup contents come from the IT team, never invented.** This is **OPEN-4**. Do not
   seed departments or categories with placeholder values — invented lookup data looks
   authoritative and is wrong. The seed step is written *after* the real list arrives, and
   lives outside `migrations/` (see `packages/db/migrations/README.md`).

## RBAC (from §3.3)

- Manage users / lookups → **IT_ADMINISTRATOR only**.
- Read lookups (for dropdowns) → both roles.

## API surface

| Method + path | Purpose | Auth |
|---|---|---|
| `GET /departments`, `GET /main-issues` | Dropdown vocabularies (active only) | any role |
| `POST/PATCH /departments`, `/main-issues` | Manage lookups | **admin** |
| `GET/POST/PATCH /users` | Manage users | **admin** |

No `DELETE` anywhere — deactivate with `is_active = false`. DTOs in
`@11ftc/shared/dto/master-data.dto.ts`.

## Observability

- **Log** deactivations (actor, entity, id) — retiring a lookup is a rare, meaningful event.
- **Measure** nothing hot; these are low-frequency admin actions.

## Security

- Manage users/lookups/sync-config → `@Roles('IT_ADMINISTRATOR')`. Reads open to both roles.
- Validate lookup labels (length, non-empty); enforce `UNIQUE(name)` / `UNIQUE(label)`.

## Acceptance criteria

- FR-10/11/12/16: employees registered, updated, maintained; deactivation preserves history.
- No invented seed data (OPEN-4) — lookups come from the IT team.

## Tests that gate merge

- Deactivating a department leaves existing tickets readable and their department name
  intact.

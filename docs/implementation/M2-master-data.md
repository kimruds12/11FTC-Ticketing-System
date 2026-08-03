# M2 — Master Data

**Realizes:** FR-10–12, FR-16, §6A–C · **Depends on:** M1 · **Risk:** Low
**Folder:** `apps/api/src/master-data/`

## Contract

Owns the lookups and directories the encoding form and dashboards depend on:
**Departments**, **Main-Issue Categories**, **System Users**, and the **Employee**
directory. Provides read endpoints for the web app's dropdowns and RBAC-gated write
endpoints for maintenance.

## Two "people" surfaces that must never be conflated

M2 manages two entirely separate entities. They share nothing but a name pattern, and
blurring them is a real modelling bug. See [ADR-0013](../adr/0013-user-provisioning-admin-invite.md).

| | **System Users** (`public.users`) | **Employees** (`employees`) |
|---|---|---|
| Who | IT department staff who operate the system | Any company employee who **reports** a concern |
| Log in? | **Yes** — Supabase Auth | **Never** — no account, no auth |
| Has | email, **role**, `is_active`, a Supabase auth identity | name, department, `is_active` — **no email, no role** |
| On a ticket | `created_by`, `updated_by` | `employee_id` (the reporter) |
| Created via | **Admin-invite** (service_role) / SQL bootstrap | Inline resolve-or-create (M4) **or** admin directory CRUD |

> A System User is **not** an Employee and vice versa. "Registering a user" (an account
> with a role) and "registering an employee" (a directory entry so a ticket can name its
> reporter) are two independent flows that never touch each other.

## Files to create

```
master-data/
├── master-data.module.ts     (exists — scaffold)
├── master-data.service.ts    (exists — scaffold)
├── department.controller.ts  admin-only writes; list readable to both roles
├── main-issue.controller.ts  same
├── user.controller.ts        admin-only — SYSTEM USER provisioning (invite) + role/is_active
├── employee.controller.ts    admin-only — EMPLOYEE directory CRUD (name/department/is_active)
└── dtos in packages/shared    CreateDepartmentDto, InviteUserDto, … (Zod)
```

Employee directory CRUD lives here, but the **inline resolve-or-create** path (typed on the
encode form) is M4 — the admin path and the inline path must call the **same**
normalize/insert code (M4 invariant 1).

## Surface A — System User provisioning (Google OAuth + admin allowlist)

Sign-in is **Google OAuth (Gmail)** via Supabase — no passwords. Because OAuth first-login
*is* account creation, "sign-up" can't be switched off; instead, **the `public.users` row is
an allowlist entry and is the authorization to use the system.** Anyone can authenticate with
Google, but only pre-authorized emails can use the app. See
[ADR-0013](../adr/0013-user-provisioning-admin-invite.md).

- **Admin "invite" = pre-authorize an email.** `POST /users/invite`, guarded
  `@Roles('IT_ADMINISTRATOR')`, inserts a `public.users` row keyed by the invitee's **Gmail
  address** + full name + role, `is_active = true`. No password, no identity creation — the
  admin grants *authorization*, not credentials.
- **User "confirms" = Sign in with Google** using that Gmail. Supabase creates/links the
  `auth.users` identity on first login; M1 matches the JWT to the pre-authorized
  `public.users` row and lets them in. A valid Google/Supabase JWT with **no** matching row →
  403 (`no-user-row`, M1). That 403 is the real gate.
- **Bootstrap (the first admin):** an admin-only endpoint cannot authorize the *first*
  administrator (chicken-and-egg). Pre-insert the admin's `public.users` row (their Gmail +
  `IT_ADMINISTRATOR`) via a reviewed SQL/script step, then they sign in with Google. Required
  before anyone else can be invited.
- **OAuth hardening** (the allowlist does the real work): enable **only** the Google provider
  (disable email/password); optionally restrict to the org's Google Workspace domain (`hd`
  claim / Supabase allowed domains); optionally a *before-user-created* auth hook to reject
  non-allowlisted emails. None are required for correctness — the `no-user-row` 403 already
  denies them — but they shrink the public surface.
- **Deactivation:** set `is_active = false` (M1 then rejects them even with a valid JWT).
  Never delete a user — `created_by` / `updated_by` FKs must keep resolving.

> **Linkage (DECIDED, ADR-0013):** the invite keys on `email`; on first Google sign-in the
> matching session's `sub` is bound into `public.users.auth_uid` (added in M1's Step 0
> migration). `AuthGuard` matches by `sub`, falling back to `email` for the one-time claim.

## Surface B — Employee directory (auth-free)

Employees are a plain directory so each ticket can be attributed to the person who reported
the concern. No accounts, no roles, no invites.

- **Primary creation path is inline (M4):** as the encoder types the reporter's name, the
  form surfaces existing matches first (FR-13/14) and creates a new `employees` row on miss
  via `resolveOrCreate(name, departmentId, tx)`, deduped by the `name_normalized` UNIQUE
  index. Most employees enter the system organically this way.
- **Admin directory CRUD (this module):** add / edit / deactivate employees to tidy the
  directory (fix a misspelling, deactivate someone who left). Retiring = `is_active = false`;
  historical tickets keep their reporter.

## How it works

- Plain Drizzle reads/writes against `departments`, `main_issue_category`, `users`,
  `employees`. No transaction gymnastics — these are simple CRUD, not the ticket path. With
  Google OAuth the invite is just a `public.users` insert (an allowlist row); there is **no**
  external identity-creation call — Supabase creates the `auth.users` row itself on the
  invitee's first Google login.
- **No admin console UI in v1** (deferred). Lookups can be managed via SQL/seed; expose the
  read endpoints the dropdowns consume and the minimal RBAC-gated write endpoints.
- `is_active` on every entity. Retiring = set `is_active = false`.

## Invariants

1. **Retiring a lookup/employee/user never orphans history.** Set `is_active = false`, never
   `DELETE`. A ticket that referenced a now-retired department, employee, or user still
   renders, because the row still exists.
2. **Lookup contents come from the IT team, never invented.** This is **OPEN-4**. Do not
   seed departments or categories with placeholder values — invented lookup data looks
   authoritative and is wrong. The seed step is written *after* the real list arrives, and
   lives outside `migrations/` (see `packages/db/migrations/README.md`).
3. **Users ≠ Employees.** They are separate tables with separate lifecycles; no code path
   turns one into the other. Only Users authenticate.
4. **Authorization is the allowlist, not authentication.** Anyone may authenticate via
   Google, but only an allowlisted email (a `public.users` row) is authorized — no row → 403
   (`no-user-row`). `service_role` never leaves the backend.

## RBAC (from §3.3)

- Manage users / employees / lookups → **IT_ADMINISTRATOR only**.
- Read lookups (for dropdowns) and search employees → both roles.

## API surface

| Method + path | Purpose | Auth |
|---|---|---|
| `GET /departments`, `GET /main-issues` | Dropdown vocabularies (active only) | any role |
| `POST/PATCH /departments`, `/main-issues` | Manage lookups | **admin** |
| `GET /users` | List system users | **admin** |
| `POST /users/invite` | Pre-authorize a Gmail (insert the `public.users` allowlist row + role) | **admin** |
| `PATCH /users/:id` | Update role / `is_active` | **admin** |
| `POST/PATCH /employees` | Employee directory management | **admin** |

Employee **search** (`GET /employees/search`) and inline resolve-or-create are M4. No
`DELETE` anywhere — deactivate with `is_active = false`. DTOs in
`@11ftc/shared/dto/master-data.dto.ts`.

## Observability

- **Log** provisioning and deactivations (actor, entity, id) — allowlisting a user or
  retiring a lookup/employee is a rare, meaningful event.
- **Log** first-login binding, if the `auth_uid`-on-first-login option is taken (which
  allowlisted email claimed which `sub`) — a once-per-user event worth an audit trail.
- **Measure** nothing hot; these are low-frequency admin actions.

## Security

- Manage users/employees/lookups → `@Roles('IT_ADMINISTRATOR')`. Reads open to both roles.
- `service_role` key, if used at all (admin management), stays **only** on the backend —
  never shipped to the web app (which holds the anon key alone). The invite itself is a plain
  allowlist insert and needs no elevated key.
- Enable only the Google OAuth provider; consider a Workspace-domain restriction so only
  company Gmails can authenticate (ADR-0013).
- Validate the invited **email** (well-formed, unique) and lookup labels / employee names
  (length, non-empty); enforce `UNIQUE(email)` / `UNIQUE(name)` / `UNIQUE(label)` /
  `UNIQUE(name_normalized)`.

## Acceptance criteria

- FR-10/11/12/16: employees registered, updated, maintained; deactivation preserves history.
- Only an admin can authorize a user (add the allowlist row); an authenticated but
  non-allowlisted Google account is denied (403 `no-user-row`).
- Users and Employees remain distinct — an employee never gains an account, a user is never
  used as a reporter.
- No invented seed data (OPEN-4) — lookups come from the IT team.

## Tests that gate merge

- Deactivating a department leaves existing tickets readable and their department name
  intact.
- Inviting a user creates exactly one `public.users` allowlist row with the given role; a
  non-admin calling `POST /users/invite` → 403.
- An allowlisted Gmail can sign in with Google and use the app; a valid Google login whose
  email is **not** allowlisted is rejected 403 (`no-user-row`).
- Creating an employee via the admin path and via the inline path (M4) produces the **same**
  normalized dedup result (no near-duplicate).

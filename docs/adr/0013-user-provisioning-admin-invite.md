# ADR-0013 — User provisioning: Google OAuth + admin allowlist; Users vs Employees

**Status:** Accepted · **Affects:** M1 (auth), M2 (master-data), Supabase config · **Date:** 2026-07-27
**Detail:** [docs/implementation/M2-master-data.md](../implementation/M2-master-data.md)

## Context

The system is **internal-only**. We need accounts for IT department staff, but no public
self-registration of *authorized* users. Sign-in uses **Supabase OAuth — Google (Gmail)**
as the primary provider; there are no passwords. Two questions had to be settled before
building M1/M2:

1. How do new **system users** (accounts with roles) get authorized, given that OAuth
   first-login *is* account creation and therefore can't be "turned off"?
2. The domain has two distinct "people" concepts that are easy to conflate — the staff who
   **operate** the system, and the company employees who **report** concerns and get named
   on tickets.

## Decision

**Users ≠ Employees — two separate entities, one authenticates.**

| | System User (`public.users`) | Employee (`employees`) |
|---|---|---|
| Purpose | operate the system | be attributed as ticket **reporter** |
| Authenticates | yes (Google OAuth via Supabase) | **never** |
| Has role | yes | no |
| On a ticket | `created_by`, `assigned_to` | `employee_id` |
| Authorized by | admin allowlist entry / SQL bootstrap | inline resolve-or-create (M4) or admin CRUD |

**User provisioning = Google OAuth sign-in, gated by an admin-managed allowlist.**

- **The `public.users` row is the allowlist entry, and it is the authorization to use the
  system.** A valid Supabase JWT with no matching `public.users` row is rejected 403
  (`no-user-row`, M1). This is what makes open OAuth login safe: anyone can *authenticate*
  with Google, but only pre-authorized emails can *use* the app.
- **Admin "invite" = pre-authorize an email.** `POST /users/invite` (M2),
  `@Roles('IT_ADMINISTRATOR')`, inserts a `public.users` row keyed by the invitee's **Gmail
  address** + full name + role, `is_active = true`. No password, no Supabase Admin identity
  creation — the admin is granting authorization, not creating credentials.
- **User "confirms/registers" = Sign in with Google** using that Gmail. Supabase creates/
  links the `auth.users` identity on first login; M1 matches the JWT to the pre-authorized
  `public.users` row and lets them in.
- **First admin is bootstrapped out of band:** pre-insert the admin's `public.users` row
  (their Gmail + `IT_ADMINISTRATOR`) via a reviewed SQL/script step, then they sign in with
  Google. An admin-only endpoint cannot authorize the first admin.
- **OAuth hardening (the gate does the real work):**
  - Enable **only** the Google provider in Supabase Auth; disable email/password sign-up.
  - Optionally restrict to the organization's Google Workspace domain (the `hd` claim /
    Supabase allowed domains) so only company Gmails can even authenticate.
  - Optionally a *before-user-created* auth hook that rejects non-allowlisted emails, to stop
    stray `auth.users` rows being created at all. Belt-and-suspenders; not required for
    correctness because the `no-user-row` 403 already denies them.
- **Employees never authenticate** — no email, no role, no auth identity. They enter via the
  M4 inline resolve-or-create (deduped by `name_normalized`) or admin directory CRUD.
- Nothing deleted — deactivate users/employees with `is_active = false`.

## Consequences

- M1 stays verification+RBAC only; authorization/allowlist management is squarely M2. M1
  still verifies the **Supabase-issued** session JWT locally via JWKS — the Google exchange
  happens upstream of Supabase and does **not** change M1's verification.
- `service_role` stays on the backend (M1 invariant 3). With OAuth the invite endpoint no
  longer even needs the Admin API to create identities — it only writes the allowlist row —
  so `service_role` is needed only for admin listing/management, if at all.
- **Linkage — DECIDED:** `public.users` links to the auth identity by **email match +
  `auth_uid` bound on first login**. The invite keys on `email` (the admin knows only that;
  the Supabase `sub` doesn't exist until first Google login). On first sign-in, the first JWT
  whose `email` matches an allowlisted row stores its `sub` into a new
  `public.users.auth_uid` (uuid, unique, nullable-until-claimed); thereafter `AuthGuard`
  matches by `sub`, falling back to `email` to perform the one-time claim. `email` is already
  UNIQUE on `public.users`. **Requires a migration** adding `auth_uid`, applied as part of
  M1's Step 0.
- A future admin-console UI (deferred past v1) wraps the same allowlist endpoint; no redesign.

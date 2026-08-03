# M1 — Auth & RBAC

**Realizes:** SRS §3, §3.3, §6C · **Depends on:** Supabase Auth · **Risk:** Low
**Folder:** `apps/api/src/auth/`

## Contract

Every request arrives with a verified `AuthContext { userId, role, fullName }` or is
rejected. No route reads the raw JWT.

## Not in scope (important)

M1 is **verification + RBAC only** — it *authenticates* requests, it does not *register* or
*create* anyone.

- **Sign-in** is **Google OAuth (Gmail)** via Supabase, done by the **web app**; the API
  never sees a password. Supabase exchanges the Google login for its own session JWT — M1
  verifies **that Supabase JWT** locally via JWKS (below). The Google exchange is upstream of
  Supabase and does not change M1's verification.
- **Authorization** (which Gmail may use the system, and as what role) is an **admin-managed
  allowlist** in **M2** — the `public.users` row. There is no self-authorization: anyone can
  authenticate with Google, but only an allowlisted email passes. See
  [ADR-0013](../adr/0013-user-provisioning-admin-invite.md) and [M2](M2-master-data.md).
- **Employees** (ticket reporters) are a separate, auth-free directory — also M2/M4, not
  M1. A System User is not an Employee.

M1's job is simply: given a Supabase JWT, decide *who this is and whether they may proceed*.

## Files to create

```
auth/
├── auth.module.ts            (exists — scaffold)
├── auth.service.ts           (exists — scaffold)
├── jwks.provider.ts          createRemoteJWKSet, cached ~10 min, no longer
├── auth.guard.ts             verify signature/expiry → load public.users → attach context
├── roles.guard.ts            enforce @Roles() against the §3.3 matrix
├── roles.decorator.ts        @Roles('IT_ADMINISTRATOR')
├── current-user.decorator.ts @CurrentUser() param decorator → AuthContext
└── auth.guard.spec.ts        the four gating tests below
```

## How it works

1. Supabase Auth issues the session JWT (the web app signs in; the API never sees a
   password). The API **verifies locally** — no Supabase round trip per request.
2. `jwks.provider.ts` builds `createRemoteJWKSet(new URL(SUPABASE_JWKS_URL))`. `jose`
   caches keys; the endpoint is edge-cached ~10 min. **Do not add a longer in-process
   cache** — key rotation would then silently reject valid users.
3. `AuthGuard`:
   - `jwtVerify(token, jwks, { ... })` → throws on bad signature/expiry → **401**.
   - Load the `public.users` allowlist row — by the JWT `email` (with `auth_uid` bound on
     first login, then by `sub`); see invariant 1 for the pending linkage decision.
   - If no row (`no-user-row`), or `is_active = false` → **403**.
   - Attach `AuthContext` to the request.
4. `RolesGuard` reads `@Roles(...)` metadata and compares against `ctx.role`.

Register `AuthGuard` globally (`APP_GUARD`) so routes are closed by default; opt public
routes out explicitly.

## Invariants (from the spec — do not violate)

1. **`public.users` is the User entity, not `auth.users`.** `created_by` and
   `updated_by` FK to *our* table. Ticket ASSIGNMENT does not — it goes through
   `technicians`, which need no account (ADR-0017). The allowlist row is created by **email** (M2), because
   the Supabase `sub` doesn't exist until the invitee's first Google login.
   **Linkage (DECIDED, ADR-0013):** match by the JWT `email` claim and **bind `auth_uid` on
   first login** — the first matching-email session stores its `sub` into a new
   `public.users.auth_uid` (uuid, unique, nullable-until-claimed); match by `sub` thereafter,
   falling back to `email` only to perform the one-time claim. The `auth_uid` column is added
   in M1's Step 0 migration.
2. A deactivated user is rejected even with a valid JWT.
3. The `service_role` key never leaves the backend. The web app gets only the anon key.

## Watch-outs

- **HS256 vs ES256.** Supabase is mid-migration from symmetric to asymmetric signing.
  Confirm which your project issues *before* writing the verifier — the JWKS path assumes
  asymmetric (ES256). If yours is still HS256, verification uses the shared secret instead,
  and `createRemoteJWKSet` does not apply.
- Clock skew: allow a small `clockTolerance` in `jwtVerify`.

## OPEN-2

The §3.3 matrix has one unconfirmed cell: **dashboard access for IT Staff**. Model the
matrix so that flipping this is a one-line change (a single `@Roles` on the analytics
controller), not a refactor.

## API surface

| Method + path | Purpose | Auth | Errors |
|---|---|---|---|
| `GET /me` | Return the caller's `AuthContext { userId, role, fullName }` | any valid session | 401 |

M1 mostly provides **guards**, not routes: `AuthGuard` (global, `APP_GUARD`) and
`RolesGuard`. Register the guard globally so routes are closed by default; opt public
routes out explicitly.

## Observability

- **Log** every rejection with a reason code (`expired`, `tampered`, `inactive`,
  `no-user-row`) and the auth UID — never the raw token.
- **Measure** the 401/403 rate and JWKS-fetch failures; a spike in JWKS failures means key
  rotation or a bad `SUPABASE_JWKS_URL`, and every user is about to be rejected.
- **Trace** nothing sensitive; auth runs before the request span starts.

## Security

- Verify signature + expiry via JWKS with a small `clockTolerance`. Confirm HS256 vs ES256
  first (Supabase migration) — see Watch-outs.
- `service_role` key never leaves the backend; the web app gets the anon key only.
- A deactivated user (`is_active = false`) is rejected even with a valid JWT.

## Acceptance criteria

- Routes are closed by default; every mutating route resolves an `AuthContext`.
- The four gating tests below pass.
- OPEN-2 (IT-Staff dashboard) is a one-line `@Roles` change, not a refactor.

## Tests that gate merge

- Expired JWT → 401
- Valid JWT, `is_active = false` → 403
- `IT_STAFF` hitting an admin-only route → 403
- Tampered signature → 401

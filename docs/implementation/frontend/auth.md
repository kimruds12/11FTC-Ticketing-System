# Frontend — Auth & session

**Realizes:** SRS §3, §3.3 · **Backend:** M1 · **Routes:** `(auth)/sign-in`, `(app)/layout.tsx`

## Screens

- **Sign in** — email/password via Supabase Auth (anon key). On success, hold the session.
- **Protected shell** — `(app)/layout.tsx` is a Server Component that checks the session and
  loads the role into context; unauthenticated users are redirected to sign-in.

## Data / API

- `src/lib/auth.ts` — Supabase client (anon key only), session helpers.
- `src/services/` — the Axios layer (`serverApi()` / `browserApi()`) attaches
  `Authorization: Bearer <jwt>` to every API call via a request interceptor (see
  [architecture.md](architecture.md)). The API verifies the JWT via JWKS; the browser does no
  verification.
- `GET /me` (M1) → `{ userId, role, fullName }` to populate the role in the app shell.

## RBAC in the UI

- Read the role once in the shell; expose it via context.
- Hide admin-only nav (employees, user/lookup management) for `IT_STAFF`. **Cosmetic only**
  — the API rejects unauthorized calls regardless.
- Dashboard visibility for `IT_STAFF` is **OPEN-2**; gate it behind one flag so flipping it
  is a one-line change.

## States

- Signing in, invalid credentials, expired session (redirect to sign-in), deactivated user
  (API returns 403 → show "account deactivated, contact IT admin").

## Security

- **Anon key only** in the browser; the `service_role` key never reaches the client.
- Never store the JWT anywhere a script injection could read it beyond what Supabase's SDK
  manages; rely on the SDK's session handling.

## Acceptance criteria

- Unauthenticated access to any `(app)` route redirects to sign-in.
- Role drives nav visibility; deactivated/expired sessions are handled gracefully.

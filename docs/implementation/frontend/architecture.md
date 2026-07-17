# Frontend — Web application architecture (apps/web)

**Status:** Design — read before implementing any web feature · **Decision record:** [ADR-0011](../../adr/0011-frontend-architecture-feature-slice-redux-axios.md)
**Stack:** Next.js 16 (App Router) · TypeScript strict · Tailwind · **Redux Toolkit** (client state) · **Axios** (HTTP client) · React Server Components + **Server Actions**

This document defines *how the web app is structured* — the folders, the layers, the
allowed import directions, and the four data-flow patterns. Per-screen behaviour stays in
the feature guides ([auth](auth.md), [encode](encode.md), [queue](queue.md),
[detail](detail.md), [employees](employees.md), [dashboard](dashboard.md)); this doc is the
skeleton they all hang on.

## The one invariant that shapes everything

**The web app carries NO business logic** (CLAUDE.md; [frontend README](README.md)). The
state machine, RBAC, numbering, and employee de-dup are enforced **server-side in
`apps/api`**. Every rule below exists to keep it that way:

- **Redux stores client state, never domain rules.** A slice may remember "the queue filter
  is `Ongoing`" or "the toast is open". It must never decide whether a transition is legal
  or compute a ticket number.
- **Server Actions and services are transport, not logic.** They shape a request, attach the
  JWT, call the API, and hand back the typed response. No validation-that-matters, no
  branching that changes domain outcomes — the API is the authority and re-checks everything.
- **The Zod schemas and DTOs come from `@11ftc/shared`.** The form validates with the *same*
  schema the API validates with. We never fork a rule into the browser.

## Layered structure

Five layers, top depends on the ones below it, **never upward or sideways across
features**. This is the whole architecture in one picture:

```
┌─────────────────────────────────────────────────────────────────┐
│  app/            Next.js routing only — thin. Composes features.  │  routes
├─────────────────────────────────────────────────────────────────┤
│  features/<slice>/   auth · tickets · employees · dashboard       │  features
│     components/  hooks/  actions.ts  store/slice.ts  schema.ts     │
├─────────────────────────────────────────────────────────────────┤
│  components/     hooks/         shared, cross-feature, presentational │  shared UI
├─────────────────────────────────────────────────────────────────┤
│  services/       Axios API clients — the ONLY place axios lives    │  transport
├─────────────────────────────────────────────────────────────────┤
│  store/   lib/   Redux store wiring · utils · auth · config        │  foundation
└─────────────────────────────────────────────────────────────────┘
```

### Directory layout (standardize on `src/`)

Everything moves under `src/` so route code and non-route code are cleanly separated (the
existing feature docs already reference `src/lib/...`). `app/` holds *only* routing.

```
apps/web/
├── src/
│   ├── app/                          # App Router — routing & composition ONLY, no logic
│   │   ├── (auth)/sign-in/page.tsx
│   │   └── (app)/
│   │       ├── layout.tsx            # server session check; seeds authSlice on the client
│   │       ├── tickets/
│   │       │   ├── page.tsx          # queue  → features/tickets
│   │       │   ├── new/page.tsx      # encode → features/tickets
│   │       │   └── [ticketId]/page.tsx
│   │       ├── employees/page.tsx    # admin  → features/employees
│   │       └── dashboard/page.tsx    # analytics → features/dashboard
│   │
│   ├── features/                     # ← FEATURE-SLICES. Each is self-contained.
│   │   ├── auth/
│   │   ├── tickets/
│   │   ├── employees/
│   │   └── dashboard/
│   │
│   ├── components/                   # shared, dumb, cross-feature UI (Button, Dialog, …)
│   │   └── ui/
│   ├── hooks/                        # shared custom hooks (useDebounce, useMediaQuery, …)
│   ├── services/                     # Axios API services — the ONLY axios consumers
│   │   ├── http.ts                   # createApiClient(getToken): the axios factory
│   │   ├── server.ts                 # serverApi()  — token from cookies (RSC/actions)
│   │   ├── browser.ts                # browserApi() — token from Supabase SDK (client)
│   │   ├── tickets.service.ts
│   │   ├── employees.service.ts
│   │   └── dashboard.service.ts
│   ├── store/                        # Redux Toolkit wiring
│   │   ├── index.ts                  # configureStore, RootState, AppDispatch
│   │   ├── hooks.ts                  # typed useAppSelector / useAppDispatch
│   │   └── StoreProvider.tsx         # 'use client' provider mounted in the app shell
│   ├── lib/                          # framework glue & pure utils
│   │   ├── auth.ts                   # Supabase client (anon key), session helpers
│   │   ├── env.ts                    # validated public env (NEXT_PUBLIC_*)
│   │   └── utils/                    # pure, dependency-free helpers (format, cn, …)
│   └── styles/
└── (config: next.config.mjs, eslint.config.mjs, tailwind.config.ts, tsconfig.json)
```

### Anatomy of a feature-slice

Every slice has the **same internal shape**, so any contributor (or agent) knows where a
thing lives without looking. Example — `features/tickets/`:

```
features/tickets/
├── components/                 # feature-owned UI (StatusPicker, EmployeeCombobox, TicketRow)
├── hooks/                      # feature-owned hooks (useEmployeeSearch, useTicketFilters)
├── actions.ts                 # 'use server' — server actions (encode, update, mark-ongoing, close)
├── store/
│   └── ticketFiltersSlice.ts  # CLIENT state only (active filter, page). NOT ticket data.
├── schema.ts                  # re-exports the Zod schema/DTO from @11ftc/shared (single source)
├── types.ts                   # view-model types local to this feature, if any
└── index.ts                   # public surface of the slice (what app/ and siblings may import)
```

A **feature may not import another feature's internals.** If `tickets` and `employees` both
need something, that something is shared UI, a shared hook, or a service — promote it down a
layer. `index.ts` is the only door in.

## Where each concern the user asked for lives

| Concern | Location | Rule |
|---|---|---|
| **Feature-slices** | `src/features/<slice>/` | Self-contained; cross-feature reuse gets promoted to a lower layer, never imported sideways. |
| **Shared components** | `src/components/` (+ `features/*/components/` for feature-owned) | Presentational/dumb. No store access, no axios, no server actions. Props in, events out. |
| **Custom hooks** | `src/hooks/` (shared) + `features/*/hooks/` | Encapsulate client behaviour (debounce, combobox, filter state). May read the store; may call `browserApi()`. Never contain domain rules. |
| **Utils** | `src/lib/utils/` | Pure, side-effect-free, framework-agnostic. Formatting, `cn()`, date display. Domain helpers like `normalizeName` come from `@11ftc/shared`, never re-implemented. |
| **API services** | `src/services/*.service.ts` | The **only** axios consumers. One function per API endpoint, typed with `@11ftc/shared` DTOs. Callable from server actions (server) and thunks/hooks (client). |
| **Server actions** | `features/*/actions.ts` (`'use server'`) | Thin server-side entry points that **trigger api services**, then `revalidatePath`. The mutation door for forms. See the flow diagrams below. |
| **Client state (Redux/RTK)** | `src/store/` + `features/*/store/*Slice.ts` | Cross-cutting *client* state only: session/role, UI (modals/toasts), queue filters, ephemeral/optimistic flags. |

## State: what Redux owns, and what it does not

We chose the **hybrid** model (ADR-0011): **Server Components + Server Actions own server
data; Redux owns only client state.** This keeps the bundle small and leans on Next 16's
caching/revalidation instead of hand-rolling a client-side cache.

**Redux/RTK holds (client state):**

| Slice | Owns | Notes |
|---|---|---|
| `authSlice` | `userId`, `role`, `fullName`, session status | Seeded by the server shell (`(app)/layout.tsx`) from `GET /me`; drives cosmetic RBAC. |
| `uiSlice` | open modals/dialogs, toasts/notifications, global spinners | Pure presentation. |
| `ticketFiltersSlice` | active status filter, search text, page/sort | Read by the queue; mirrored to the URL where it aids shareability. |

**Redux does NOT hold** ticket lists, ticket detail, employee lists, or dashboard
aggregates. Those are **server data**: fetched in a Server Component (via a service call or
server action), passed down as props, and revalidated with `revalidatePath` after a
mutation. Putting server data in Redux is the anti-pattern this decision exists to prevent.

> **Why not RTK Query?** RTK Query is a data-fetching/caching layer that would *replace*
> Axios and duplicate what Server Components already give us here. We deliberately use plain
> RTK slices for client state + Axios services for transport (ADR-0011). If the app ever
> becomes client-data-heavy, revisit with a new ADR — don't bolt it on silently.

## Transport: the Axios layer

Axios lives in exactly one place: `src/services/`. Two thin entry points wrap one factory,
so the *same* service functions run on server and client with the right token source.

```
src/services/http.ts
  createApiClient(getToken): AxiosInstance
    • baseURL = API_URL
    • request interceptor: Authorization: Bearer <await getToken()>
    • response interceptor: unwrap data; normalize API errors → typed AppError

src/services/server.ts     (server-only)
  serverApi()  → createApiClient(() => tokenFromCookies())   // RSC + server actions

src/services/browser.ts    ('use client')
  browserApi() → createApiClient(() => tokenFromSupabaseSDK())  // thunks + client hooks

src/services/tickets.service.ts
  export const ticketsService = (api: AxiosInstance) => ({
    list(filters):  Promise<TicketList>,
    getById(id):    Promise<TicketDetail>,
    encode(dto):    Promise<Ticket>,      // dto typed by EncodeTicket from @11ftc/shared
    update(id,dto): Promise<Ticket>,
    transition(id, next): Promise<Ticket>,
  })
```

The JWT is **never** verified in the browser — the API verifies it via JWKS (M1). The
services only *attach* it. The `service_role` key never reaches this layer.

## The four data-flow patterns

Everything the UI does is one of these four. Keeping to them is what keeps business logic
out of the web app.

**1. Server read (queue, detail, dashboard) — the default for showing data**
```
Server Component (page.tsx)
   → serverApi() → ticketsService.list(filters)   [axios, Bearer from cookies]
   → API (M5/M9)
   → returns typed data → rendered as props (no client fetch, no Redux)
```

**2. Mutation via Server Action (encode, edit, transition) — the default for forms**
```
Client form  → server action  ('use server', features/tickets/actions.ts)
   → serverApi() → ticketsService.encode(dto)   [axios]
   → API (M5) enforces state machine + numbering + audit + outbox (one tx)
   → revalidatePath('/tickets')  →  Server Components re-read fresh data
   → action returns {ok|error} → form shows toast / inline errors
```

**3. Client-side interactive read (employee typeahead) — needs per-keystroke fetch**
```
EmployeeCombobox (client)  → useEmployeeSearch (hook)
   → browserApi() → employeesService.search(normalizeName(q))   [axios]
   → API (M4) → matches rendered; match-first, then "create new"
```

**4. Client state (filters, modals, role, toasts) — no network**
```
Component → useAppDispatch()/useAppSelector() → slice reducer
   (ticketFiltersSlice / uiSlice / authSlice)
```

Rule of thumb: **if it's server data, prefer pattern 1/2 (RSC + actions). If it's ephemeral
client state, use pattern 4 (Redux). Only reach for pattern 3 when a read genuinely must
happen on the client per interaction.**

## Import-direction rules (enforce in review; candidates for lint later)

- `app/` → may import `features/*` (their `index.ts`), `components/`, `lib/`.
- `features/<a>/` → may import `components/`, `hooks/`, `services/`, `store/`, `lib/`,
  `@11ftc/shared`. **May NOT import `features/<b>/`** internals.
- `components/`, `hooks/`, `lib/` → shared; **may NOT import `features/*` or `services/*`
  domain calls** (a shared component that fetches is not shared). `hooks/` may use the store.
- `services/` → may import `lib/` and `@11ftc/shared` only. No React, no store, no features.
- `store/` slices → framework-free reducers; no axios, no server actions inside reducers
  (side-effects live in thunks/actions, and server data isn't cached here anyway).
- **`'use server'` files** (`actions.ts`) → server-only; never imported into a Client
  Component's module graph except as an action reference.

## How this maps to the existing feature docs

The feature guides are unchanged in intent; this architecture just says *where their pieces
live*:

| Feature guide | Slice | Key pieces |
|---|---|---|
| [auth.md](auth.md) | `features/auth` + `lib/auth.ts` | `(app)/layout.tsx` server session check → seeds `authSlice`; cosmetic RBAC from role. |
| [encode.md](encode.md) | `features/tickets` | `StatusPicker`, `EmployeeCombobox`, `DateField` in `components/`; submit via server action → `ticketsService.encode`. |
| [queue.md](queue.md) | `features/tickets` | RSC read (pattern 1) + `ticketFiltersSlice` for filter state (pattern 4). |
| [detail.md](detail.md) | `features/tickets` | RSC read; transitions via server action (pattern 2); audit history rendered from API. |
| [employees.md](employees.md) | `features/employees` | typeahead via `useEmployeeSearch` (pattern 3); admin-gated (cosmetic). |
| [dashboard.md](dashboard.md) | `features/dashboard` | RSC read of M9 aggregates; no Redux, no client fetch. |

## What NOT to do (the traps this structure closes)

- **No axios outside `src/services/`.** A component or hook that imports axios directly is a
  bug — go through a service.
- **No server data in Redux.** No `ticketsSlice` holding a fetched list; that's what RSC +
  `revalidatePath` are for.
- **No domain logic in actions/services/slices.** They transport and store; the API decides.
- **No cross-feature imports.** Promote shared code down a layer instead.
- **No forked validation.** Zod schema and DTOs come from `@11ftc/shared`, always.
- **No `delete ticket` UI, no placeholder lookups** (FR-9; OPEN-4) — as in the feature docs.

## Dependencies to add (implementation, not now)

When implementation starts (not part of this doc): `@reduxjs/toolkit`, `react-redux`,
`axios`. Redux Toolkit ships its own types; `react-redux` v9 is React-19-compatible. No
RTK Query usage (see rationale above). These land in `apps/web/package.json` in the first
implementation PR, with an updated `pnpm-lock.yaml`.

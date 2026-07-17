# ADR-0011 — Frontend architecture: feature-slice + hybrid Redux + Axios + server actions

**Status:** Accepted · **Affects:** `apps/web` · **Date:** 2026-07-17
**Detail:** [docs/implementation/frontend/architecture.md](../implementation/frontend/architecture.md)

## Context

`apps/web` was scaffolded with a minimal convention ("Server Components + plain `fetch` +
`src/lib/api.ts` until a data lib earns its place"). We now need a defined structure before
building screens: feature separation, shared components/hooks/utils, a typed HTTP layer,
server actions, and cross-cutting client state. The team chose **Redux Toolkit** for state
and **Axios** for HTTP.

The load-bearing question was what Redux owns relative to server data. Two models: (a)
**hybrid** — Server Components/Server Actions own server data, Redux owns only client state;
(b) **client-owns-cache** — Redux thunks fetch everything via Axios into the store. The
project's hard invariant is that **the web app carries no business logic** (CLAUDE.md).

## Decision

- **Feature-slice structure** under `src/`: `app/` is routing only; `features/<slice>/`
  (auth, tickets, employees, dashboard) are self-contained (own components, hooks, actions,
  slice, schema) with a single `index.ts` door and **no cross-feature imports**. Shared UI,
  hooks, utils, services, and store wiring sit in lower layers.
- **Hybrid state model.** Redux/RTK holds **client state only** — `authSlice`, `uiSlice`,
  `ticketFiltersSlice`. Server data (tickets, employees, dashboard) is read in Server
  Components and mutated through **Server Actions**, then refreshed with `revalidatePath`.
- **Axios is confined to `src/services/`** — one factory (`createApiClient(getToken)`) with
  `serverApi()` (token from cookies) and `browserApi()` (token from the Supabase SDK). Services
  are typed with `@11ftc/shared` DTOs and are the only axios consumers.
- **Server Actions trigger API services; they do not implement logic.** Four sanctioned
  data-flow patterns (server read, server-action mutation, client interactive read, client
  state) — see the architecture doc.
- **No RTK Query.** It would replace Axios and duplicate Server-Component fetching; plain RTK
  slices + Axios services instead. Revisit via a new ADR only if the app becomes
  client-data-heavy.

## Consequences

- Supersedes the "plain `fetch` for reads" line in the [frontend README](../implementation/frontend/README.md);
  `src/lib/api.ts` (fetch wrapper) is replaced by the Axios services layer. The existing
  per-screen feature guides are unchanged in intent — only their pieces' *locations* are now fixed.
- Business logic stays server-side by construction: Redux can't hold domain rules, services
  and actions only transport, validation uses the shared Zod schemas.
- Import-direction rules are review-enforced now; a lint boundary rule can encode them later.
- Adds `@reduxjs/toolkit`, `react-redux`, `axios` in the first implementation PR (with an
  updated lockfile). No change to the API contract or the shared package.

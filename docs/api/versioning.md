# API & module versioning

**Decision record:** [ADR-0012](../adr/0012-api-and-module-versioning.md) · **Applies to:** `apps/api`

Two independent version axes. Keep them separate in your head — they answer different
questions.

| Axis | Question it answers | Where it lives | Who sees it |
|---|---|---|---|
| **API version** (`v1`) | "Which HTTP contract am I calling?" | URL: `/api/v1/...` | Clients (web app, external tools) |
| **Module semver** (`1.0.0`) | "Which build of module Mn is deployed?" | `MODULE_VERSIONS` registry | Ops / traceability, via `GET /api/version` |

## API version — URI versioning

The API is URI-versioned via NestJS `enableVersioning({ type: VersioningType.URI })`, with a
global `/api` prefix and **default version `1`** (`apps/api/src/main.ts`). So every route is:

```
/api/v1/<module path>          e.g.  /api/v1/tickets,  /api/v1/employees/search
```

**Version-neutral operational routes** (no version segment — they must not move when the API
version does):

```
GET /api/health     → { status, uptime }
GET /api/version    → { api: "v1", service, modules: { M1: {...}, ... } }
```

### How a controller declares its version

Every module controller declares its version **explicitly** — don't rely on the implicit
default, so the version is visible at the controller and a bump is a one-line local change:

```ts
@Controller({ path: "tickets", version: "1" })
export class TicketController { /* ... */ }
```

### Bumping a single module to v2 (the whole point of the model)

When one module needs a breaking change, only that module moves — the rest stay on v1:

1. Add a `TicketControllerV2` (or add `@Version("2")` routes) with the new shape.
2. Change that module's entry in `MODULE_VERSIONS` (`api: "2"`) and bump its `semver`.
3. Keep v1 alive during the deprecation window (see the
   [deprecation-and-migration](../../skills) skill); remove it in a later, deliberate PR.
4. The web app's affected service overrides its path/baseURL to `/api/v2/...`; every other
   service is untouched.

No global flag day. `/api/v1/tickets` and `/api/v2/tickets` can coexist.

## Module semver — the registry

`apps/api/src/common/versioning/module-versions.ts` holds one entry per module M1..M9:

```ts
M5: { name: "ticket", api: "1", semver: "1.0.0" }
```

- **`api`** — the URI version its controllers expose (matches the `@Controller` version).
- **`semver`** — bumped **in the same PR** as any change to the module's contract or
  behaviour. MAJOR = breaking API change (usually paired with an `api` bump), MINOR =
  additive, PATCH = internal fix. This is the number `GET /api/version` reports, so a
  deployed build is always identifiable.

Modules with **no HTTP surface** (M3 numbering, M7 outbox, M8 sync worker) still carry a
`semver` for deployment tracking; their `api` field is unused.

## Rules

1. **All HTTP routes are versioned** except the two version-neutral ops routes. No bare
   `/api/tickets`.
2. **Controllers declare their version explicitly.** Reviewers can see it without inferring
   the default.
3. **Bump `semver` with the change, in the same PR.** A stale registry defeats the purpose.
4. **A module version bump is local.** Never edit sibling modules to move one module's
   version.
5. **Swagger builds per version.** When the OpenAPI doc is wired (see
   [README.md](README.md)), generate one document per API version so the contract view
   matches the routes.

## Alignment with the web app

`apps/web` sets its Axios `baseURL` to `…/api/v1` (`src/lib/env.ts`), so service paths stay
clean (`/tickets`). If a module moves to v2, that single service overrides its base — the
same locality the backend model gives you.

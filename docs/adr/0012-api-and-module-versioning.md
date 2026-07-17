# ADR-0012 — API versioning (URI) + per-module semver

**Status:** Accepted · **Affects:** `apps/api`, `apps/web` (base URL) · **Date:** 2026-07-17
**Detail:** [docs/api/versioning.md](../api/versioning.md)

## Context

The backend modules (M1..M9) are about to grow HTTP controllers. Before any route exists we
need a versioning convention, so the contract can evolve without breaking the web app or any
external caller — and so we can tell which build of a module is deployed. Two questions,
often conflated: *which HTTP contract is this?* and *which module build is live?*

Options considered: (a) a single global API version with per-module semver metadata and the
ability to override one module's version; (b) fully independent, coexisting API versions per
module from day one; (c) semver only, no URL versioning until forced. This is a small
internal tool (tens of tickets/day), so (b) is premature machinery and (c) leaves no room to
evolve a single endpoint cleanly.

## Decision

- **URI API versioning** via NestJS `enableVersioning({ type: VersioningType.URI })`, global
  prefix `/api`, **default version `1`** → routes are `/api/v1/...` (`apps/api/src/main.ts`).
- **Controllers declare their version explicitly** (`@Controller({ path, version: "1" })`),
  so a single module can move to `v2` locally without a global flag day; v1 and v2 coexist.
- **Version-neutral ops routes**: `GET /api/health` and `GET /api/version` carry no version
  segment (`VERSION_NEUTRAL`).
- **Per-module semver registry** (`src/common/versioning/module-versions.ts`): each module
  carries `{ api, semver }`; `semver` is bumped in the same PR as any change and surfaced at
  `GET /api/version` for traceability. HTTP-less modules (M3/M7/M8) still carry `semver`.
- **Web app** sets its Axios `baseURL` to `…/api/v1`, keeping service paths clean.

## Consequences

- The contract can evolve one endpoint at a time; deprecation follows the
  deprecation-and-migration skill, removing an old version in a deliberate later PR.
- `GET /api/version` makes the deployed module build identifiable (observability).
- Swagger, when wired, must emit one document per API version (docs/api/README.md).
- Each future controller must declare a version and keep `MODULE_VERSIONS` current — noted in
  docs/api/versioning.md; a CI lint could enforce "controller has an explicit version" later.
- Reconciles the frontend architecture (ADR-0011): baseURL now includes `/api/v1`.

# ADR-0014 — The API compiles to ESM (NodeNext)

**Status:** Accepted · **Affects:** `apps/api` (API + worker) · **Date:** 2026-07-27
**Relates to:** ADR-0010 (toolchain versions)

## Context

`tsconfig.base.json` targets **NodeNext** (ESM), and the API source already imports with
explicit `.js` extensions — the ESM/NodeNext convention. But `apps/api/tsconfig.json`
*overrode* the base to `module: CommonJS` + `moduleResolution: Node`. That override became a
problem building M1:

- **`jose` v6 is ESM-only** (`"type": "module"`, no `require` export). `moduleResolution:
  Node` (classic) does not read a package's `exports` map, so jose's types don't resolve; and
  a CommonJS build would emit `require("jose")` of an ESM-only module — fragile, Node-version
  dependent, and wrong.
- Auth is security-critical and the first module to pull a modern ESM-only dependency; more
  will follow (the JOSE/OAuth ecosystem has largely moved to ESM).

## Decision

Remove the CommonJS override; the API **inherits NodeNext** (`module` +
`moduleResolution`) from the base config, and `apps/api/package.json` gains `"type":
"module"`. No source changes were needed — the `.js`-extension imports the code already used
are correct ESM.

## Consequences

- ESM-only dependencies (jose today) resolve via their `exports` map and load natively; no
  `require(ESM)` hazard. `nest build` emits ESM; `node dist/main.js` runs as ESM.
- The config now matches both the base tsconfig and the source's own import style; the worker
  entry (`main.worker.ts`) is covered by the same change.
- `experimentalDecorators` + `emitDecoratorMetadata` + `reflect-metadata` continue to work
  under tsc ESM output (verified: build + the verifier test suite pass).
- **Workspace packages now build to `dist` (resolved).** `@11ftc/db` and `@11ftc/shared`
  each have a `build` (`tsc -p tsconfig.build.json`) emitting ESM JS + `.d.ts`, and their
  `exports` point at `dist` (not `.ts` source). So `node apps/api/dist/main.js` runs with all
  imports resolving to real JS, and tsc emits the decorator metadata NestJS DI needs. Turbo's
  `^build` dependency (on `build`, `typecheck`, and now `dev`) builds packages first.
  Verified by a runtime smoke test: the API boots and serves `/api/health`, `/api/version`,
  and a closed-by-default `/api/v1/me` (401).
- **`tsx` was rejected** for the dev runner: it uses esbuild, which cannot emit
  `emitDecoratorMetadata`, breaking NestJS's type-based DI. Building the packages (above) is
  the runtime path for both dev (`nest start` → `dist`) and production.
- If a future dep needs CommonJS interop, `esModuleInterop` (already on) covers default/named
  import shims; we do not revert to a CommonJS build.

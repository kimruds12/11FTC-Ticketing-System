# ADR-0010 — Toolchain versions: pin TypeScript to 5.x; adopt Next 16 / NestJS 11

**Status:** Accepted · **Affects:** all workspaces · **Date:** 2026-07-15

## Context

We upgraded to the current major framework versions: **Next.js 16** + **React 19**,
**NestJS 11**, **Drizzle 0.45**, **Zod 4**, **BullMQ 5.80**, **jose 6**, **vitest 4**.
Two upgrades needed a deliberate call rather than "take latest":

1. **TypeScript 7** is now `latest` on npm (the native/Go compiler). But
   `typescript-eslint@8` still declares `typescript >=4.8.4 <6.1.0`, and NestJS's
   `emitDecoratorMetadata` story is not validated on TS7. Taking TS7 would break
   `pnpm lint` and risk the DI metadata the whole API relies on.
2. **Next.js 16 removed `next lint`** in favour of the ESLint CLI + flat config.

## Decision

- **Pin TypeScript to the latest stable 5.x (`^5.9.3`)** across all workspaces. Do not move
  to 6/7 until `typescript-eslint` supports it *and* NestJS documents TS7 decorator support.
- Adopt Next 16, React 19, NestJS 11, Drizzle 0.45, Zod 4, jose 6, vitest 4.
- Migrate `apps/web` linting to **`eslint.config.mjs`** (flat config) using
  `eslint-config-next/core-web-vitals` + `/typescript`; `lint` script is now `eslint .`.
- Keep **ESLint 9** (not 10) — fully supported by `typescript-eslint@8`,
  `eslint-config-next@16` (peer `>=9`), and our root flat config.

## Consequences

- Lint and NestJS decorators keep working; the toolchain is internally consistent.
- Drizzle 0.36+ takes an **array** from the table-config callback — the schema files were
  updated from the deprecated object form.
- Revisit TS7 once the lint/decorator ecosystem catches up; this ADR is the checkpoint.
- Node floor is ≥20.9 (Next 16); `node:20-alpine` in the Dockerfiles satisfies it.

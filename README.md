# 11FTC Ticketing Management System

Internal IT ticketing tool for the 11FTC department. Modular monolith (NestJS) + a
background sync worker + a Next.js web app, in a pnpm/Turborepo monorepo.

> **Read `CLAUDE.md` first.** It is the canonical set of invariants. The authoritative
> specs live in `docs/`; when this README and a doc disagree, the doc wins.

## Layout

```
apps/
  web/     Next.js web app (no business logic)
  api/     NestJS API (the transaction boundary) + main.worker.ts (BullMQ sync worker)
packages/
  shared/  DTOs, Zod schemas, enums, normalizeName — shared by api + web
  db/      Drizzle schema + migrations (imported by api and worker)
docs/
  *.md            SRS, System Design, module specs, traceability
  adr/            architecture decision records (0001..)
  api/            frontend↔backend contract (OpenAPI approach)
  deployment.md   Docker: local dev + production
  agent-tooling.md multi-agent skills setup (5 agents)
  diagrams/       *.d2 sources, workspace.dsl, rendered/*.svg
  implementation/ per-module build guides (M1..M9) + frontend/ (per-feature)
.claude/rules/    domain / numbering / sync-worker invariants (loaded by Claude Code)
scripts/          sync-agents (keeps AGENTS.md/copilot in sync), check-no-delete
```

## Getting started

```bash
pnpm install
cp .env.example .env      # fill in real values — never commit .env
pnpm typecheck && pnpm lint && pnpm test
```

`pnpm test:concurrency` currently **fails on purpose** — it is the specification for the
ticket-numbering module (M3) and stays red until M3 is implemented.

Or with Docker (data/auth via remote Supabase, local Redis):

```bash
cp .env.example .env      # fill in remote Supabase values
docker compose up         # api :3001, web :3000, redis :6379 — see docs/deployment.md
```

## The invariants that matter (full list in CLAUDE.md)

1. One transaction boundary: `TicketService`. Nothing beneath it opens its own tx.
2. Ticket numbers via atomic upsert, never `SELECT MAX+1`; `uq_ticket_seq` in the DB.
3. Nothing is deleted — `is_active` / status. CI greps for forbidden DELETEs.
4. Closed is terminal; the state machine is enforced server-side.
5. Sheet sync is one-way, out-of-band, and locates rows by `row_key`, never position.

## Build order

M1 → M2 → M3 → … → M9, per `docs/14-module-specifications.md`. Write the M3 concurrency
test before M3. See `docs/implementation/` for how to build each module.

## Open items (block go-live — decisions, not code)

OPEN-1 numbering scope · OPEN-2 IT-Staff dashboard access · OPEN-3 sheet hand-editing ·
OPEN-4 the real lookup lists.

<!-- GENERATED FROM CLAUDE.md — DO NOT EDIT. Run `pnpm sync:agents`. -->

# CLAUDE.md — 11FTC Ticketing Management System

**This file is the canonical source of project invariants.** `AGENTS.md` and
`.github/copilot-instructions.md` are generated copies — never edit them by hand; run
`pnpm sync:agents`. CI fails if a copy has drifted (`pnpm check:agents`).

The authoritative documents live in `docs/`. When this file and a doc disagree, the doc
wins and this file is wrong — fix it. Read before writing any module:

- `docs/11FTC_SRS_Rev3.md` — requirements, FR-1..FR-35, OPEN-1..OPEN-4
- `docs/14-module-specifications.md` — module contracts M1..M9 (invariants + gating tests)
- `docs/11FTC_System_Design.md` — §2.1 is the stack decision; do not re-litigate it
- `docs/implementation/` — per-module implementation guides (M1..M9 + frontend)

## What this system is

An internal IT ticketing tool for the 11FTC department. **Tens of tickets/day, a handful
of concurrent users.** A modular monolith (NestJS) + one background worker + a Next.js web
app. Realistic volume is small; the hard parts are correctness, not scale.

The department's real process, because the data model depends on it: **IT fixes the
concern first, then records it.** So a ticket is usually encoded already **Closed**. Three
statuses only: **Open, Ongoing, Closed**. There is no assign→resolve→close queue.

## Stack (fixed — System Design §2.1, do not change without updating that doc)

- pnpm workspaces + Turborepo
- `apps/web` — Next.js, TypeScript strict, Tailwind. **No business logic.**
- `apps/api` — NestJS, TypeScript strict. The transaction boundary. `src/main.worker.ts`
  is the second entrypoint (BullMQ consumer), same codebase, separate process.
- `packages/shared` — DTOs, Zod schemas, shared types
- `packages/db` — Drizzle schema + migrations (imported by api and worker)
- **Drizzle** over a normal `pg` pool via the Supabase **session pooler (5432)**.
- Supabase Auth; JWTs verified locally with `jose` + `createRemoteJWKSet`.
- BullMQ + Redis. **Triggers only** — no response caching yet.
- `googleapis` + `google-auth-library` for Sheets.

**Do NOT install `supabase-js` for data access.** It speaks PostgREST and cannot do
multi-statement transactions, which breaks FR-31.

## The invariants (these fail silently — CI, DB constraints, and tests enforce them)

1. **One transaction boundary: `TicketService`.** Nothing beneath it opens its own
   transaction. Number allocation, ticket write, audit rows, and the outbox row commit
   together or not at all. See `.claude/rules/domain.md`.
2. **Ticket numbers: never `SELECT MAX(seq)+1`.** Allocate with the atomic `ON CONFLICT
   DO UPDATE` upsert against `ticket_sequence`, inside the caller's transaction. A
   `UNIQUE (sequence_scope, sequence_number)` constraint exists **in the database**. See
   `.claude/rules/numbering.md`.
3. **Nothing is ever deleted.** No ticket, no audit row, no lookup. Use `is_active` and
   status. There is **no DELETE against `tickets` or `audit_log`** anywhere in the
   codebase — CI greps for it (`pnpm check:no-delete`, FR-9, FR-35).
4. **Closed is terminal (FR-8).** No reopen route. Recurrence is a new ticket. The state
   machine (`07-ticket-state-machine.d2`) is enforced **server-side**, not as a UI hint.
5. **`ongoing_at` / `closed_at` are set once**, at the moment of transition, never
   recomputed on read. Analytics (FR-21, FR-23) depend on this.
6. **Sheet sync is one-way and out-of-band.** Outbox row commits with the ticket; BullMQ
   only says "wake up and drain". Sync failure never fails encoding (FR-29). The worker
   locates sheet rows by `row_key` (ticket_no), never by remembered position. See
   `.claude/rules/sync-worker.md`.
7. **Audit at the application layer, one row per changed field**, in the same
   transaction. Not DB triggers — triggers can't see `updated_by`.
8. **Denormalize only at the sheet boundary.** IDs stay in Postgres.
9. **Who handled a ticket is a technician directory, never a user account** (ADR-0017).
   One field, `assignees: string[]` (names), resolve-or-created inside the encode
   transaction; rows live in `ticket_assignees`. Two-technician work is ~21% of the real
   history — do not collapse it back to a single FK. See `.claude/rules/domain.md`.

## Rules for contributors (human or agent)

- **Read the module spec before implementing a module.** The Invariants and
  "Tests that gate merge" sections are contracts, not suggestions.
- **Write `test:concurrency` before writing M3.** The test is the specification.
- Do NOT seed departments or main-issue categories — that is **OPEN-4**; the real lists
  come from the IT team. Invented lookup data looks authoritative and is wrong.
- `.env.example` only. Never commit a real secret.
- Do not add Redis response caching (System Design §4). BullMQ triggers only for now.
- Build order: M1 → M2 → M3 → … → M9 (see `docs/14-module-specifications.md`).
- **Stop and ask** if a requested change conflicts with these invariants or the docs.

## Agent skills & engineering standards

This repo vendors a library of engineering skills, configured for **five agents** (Claude
Code, Codex, Antigravity, OpenCode, Gemini CLI) — see `docs/agent-tooling.md` for the full
map, provenance, and update instructions. The canonical skills live in the repo-root
`skills/` dir and are mirrored into each agent's config by `pnpm sync:skills` (CI enforces
no drift). They encode general best practices: spec- and test-driven development,
incremental implementation, clean API/interface design, separation of concerns, code
review, security hardening, CI/CD, and observability.

**Use them.** Reach for the relevant skill by task: `spec-driven-development` and
`planning-and-task-breakdown` before building a module; `test-driven-development` and
`incremental-implementation` while building; `code-review-and-quality` and
`code-simplification` before merge; `security-and-hardening` and `ci-cd-and-automation`
for the pipeline. Slash commands (`/spec`, `/plan`, `/test`, `/review`, `/ship`, …) and
subagents (`code-reviewer`, `security-auditor`, `test-engineer`) are available.

**Precedence:** the vendored skills are general; this file, `.claude/rules/`, and `docs/`
are project-specific and **win on conflict**. A skill's generic advice never overrides an
invariant above (e.g. TDD guidance does not relax "write `test:concurrency` before M3", it
reinforces it). Do not edit vendored files to fit this project — encode deviations in
`.claude/rules/` or `docs/` instead.

## Open items that block go-live (not code problems — decisions)

- **OPEN-1** numbering scope (date vs year) — `TICKET_NUMBER_SCOPE`. Confirm on the sheet.
- **OPEN-2** dashboard access for IT Staff — affects the RBAC matrix.
- **OPEN-3** does anyone hand-edit the sheet — affects the M8 write strategy.
- **OPEN-4** the real lookup lists — blocks M2 seed data and M9 grouping.

# Claude Code prompt — monorepo scaffold

Paste into Claude Code, run from an empty repo directory. **Use plan mode** (`shift+tab`)
and approve the plan before it writes anything.

---

```
Scaffold the 11FTC Ticketing Management System monorepo. Structure and config only —
no business logic yet.

## Before you start

Read these first; they are the spec and they override anything you'd otherwise assume:
- docs/11FTC_SRS_Rev3.md        (requirements, FR-1..FR-35)
- docs/14-module-specifications.md (module contracts M1..M9)
- docs/11FTC_System_Design.md   (§2.1 is the stack decision — do not re-litigate it)
- CLAUDE.md                     (invariants)

Plan first. Show me the plan. Write nothing until I approve.

## Stack (fixed — see design doc §2.1)

- pnpm workspaces + Turborepo
- apps/web    — Next.js, TypeScript strict, Tailwind
- apps/api    — NestJS, TypeScript strict, Drizzle
                second entrypoint src/main.worker.ts for the BullMQ consumer
- packages/shared — DTOs, Zod schemas, shared types
- packages/db     — Drizzle schema + migrations (imported by api and worker)
- Supabase Postgres via session pooler (5432), normal pg pool
- Supabase Auth, JWTs verified locally with jose + createRemoteJWKSet
- BullMQ + Redis
- googleapis + google-auth-library

Do NOT install supabase-js for data access. It speaks PostgREST and cannot do
multi-statement transactions, which would break FR-31.

## Target structure

11ftc-ticketing/
├── CLAUDE.md
├── AGENTS.md                    → symlink or copy of CLAUDE.md (see agent section)
├── .claude/
│   ├── rules/                   → domain.md, numbering.md, sync-worker.md (already written)
│   └── settings.json            → shared team settings, committed
├── .github/
│   └── workflows/ci.yml
├── docs/
│   ├── *.md                     → SRS, design, matrix, plan, module specs
│   └── diagrams/                → *.d2, workspace.dsl
├── apps/
│   ├── web/
│   └── api/
│       └── src/
│           ├── main.ts
│           ├── main.worker.ts
│           ├── auth/            → M1
│           ├── master-data/     → M2
│           ├── numbering/       → M3
│           ├── employee/        → M4
│           ├── ticket/          → M5
│           ├── audit/           → M6
│           ├── outbox/          → M7
│           ├── sync/            → M8
│           └── analytics/       → M9
├── packages/
│   ├── shared/
│   └── db/
│       ├── schema/
│       └── migrations/
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json

Module folders under apps/api/src map 1:1 to M1..M9 in the module spec. Create the
folders with a module file and an empty service, nothing more.

## Agent configuration

Create config for multiple coding agents, all pointing at the SAME source of truth so
they cannot drift apart:

- CLAUDE.md is canonical. Already written — do not regenerate or "improve" it.
- AGENTS.md — the emerging cross-tool convention (used by Codex and others).
  Make it a symlink to CLAUDE.md if the OS allows; otherwise a copy with a header
  comment saying CLAUDE.md is canonical and this is generated.
- .github/copilot-instructions.md — same treatment.
- Add a pnpm script `sync:agents` that regenerates the copies from CLAUDE.md, and
  wire it into CI so a drifted copy fails the build.

Do not hand-write different instructions per agent. This project has already been
bitten twice by the same fact living in two places and disagreeing.

If a tool I named isn't something you know the convention for, say so rather than
inventing a config format.

## CI — this part is not optional

The invariants below fail SILENTLY. Prose instructions cannot enforce them; the
pipeline must. Create .github/workflows/ci.yml running:

- pnpm lint
- tsc --noEmit (strict)
- pnpm test
- pnpm test:concurrency   → 50 simultaneous encodes, one date, 50 distinct ticket
                            numbers. Stub it now so it fails loudly until M3 exists.
- a check that fails if any DELETE against tickets or audit_log appears in the
  codebase (FR-9, FR-35 — nothing is ever deleted)

## Rules for this task

- Do not seed departments or main issue categories. That is OPEN-4 and the real lists
  must come from the IT team. Invented lookup data looks authoritative and is wrong.
- Do not implement any module logic. Folders, module files, empty services.
- Do not add Redis response caching. It is BullMQ triggers only for now.
- .env.example only. Never a real secret.
- Stop and ask if anything here conflicts with the docs.

When done, show me the tree and the CI file.
```

---

## After it finishes

Verify with:

```bash
pnpm install
pnpm lint && pnpm test
claude          # then run /memory — confirm CLAUDE.md and .claude/rules/ loaded
```

Then work module by module in the order in `14-module-specifications.md`: M1 → M2 → M3.

**Write `test:concurrency` before writing M3.** It is the specification, not a check on it.

# Architecture Decision Records

An ADR captures **one decision, its context, and its consequences** — so the *why*
survives the people who were in the room. The System Design doc already records these
decisions in prose; ADRs pull each into a single, linkable, immutable record that a new
contributor or coding agent can read before re-litigating a settled question.

## Convention

- One file per decision: `NNNN-short-title.md`, numbered in decision order.
- **Status:** Proposed · Accepted · Superseded by ADR-XXXX. ADRs are append-only — a
  reversal is a *new* ADR that supersedes the old one, not an edit.
- Keep them short. Context → Decision → Consequences.

## Index

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-remote-supabase-drizzle-session-pooler.md) | Remote Supabase + Drizzle over the session pooler; not supabase-js | Accepted |
| [0002](0002-modular-monolith-one-worker.md) | Modular monolith + one background worker; not microservices | Accepted |
| [0003](0003-transactional-outbox-append-only-raw-tab.md) | Transactional outbox + append-only `_raw` tab for sheet sync | Accepted |
| [0004](0004-atomic-ticket-numbering.md) | Ticket numbers via atomic sequence upsert; `scope_key` defers OPEN-1 | Accepted |
| [0005](0005-three-status-terminal-closed-no-delete.md) | Three statuses, Closed terminal, nothing deleted | Accepted |
| [0006](0006-application-level-audit-log.md) | Audit at the application layer, not DB triggers | Accepted |
| [0007](0007-employee-normalized-unique.md) | Employee de-dup via one normalize() + a unique index | Accepted |
| [0008](0008-analytics-no-cache-initially.md) | No cache / no materialized views for analytics initially | Accepted |
| [0009](0009-vendored-multi-agent-skills.md) | Vendor engineering skills for five agents, canonical + mirrored | Accepted |
| [0010](0010-toolchain-versions-typescript-5x.md) | Pin TypeScript to 5.x; adopt Next 16 / NestJS 11 / Drizzle 0.45 | Accepted |

Requirements/design alignment: each ADR links the FRs and diagrams it affects. The
[traceability matrix](../12-traceability-matrix.md) links back here in its status column.

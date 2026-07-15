# Implementation guides

These sit **below** `14-module-specifications.md` (the contracts) and **above** the code.
The module spec tells you *what each module must guarantee and how it's proven*; these
guides tell you *how to build it in this codebase* — files to create, the shape of the
code, the wiring, and the traps specific to our stack.

Read order matches the build order. Do not skip ahead; M5 assumes M3, M4, M6, M7 exist.

| Guide | Module | Realizes | Risk |
|---|---|---|---|
| [00-backend-overview.md](00-backend-overview.md) | Architecture, transaction boundary, layout, testing | — | — |
| [M1-auth.md](M1-auth.md) | Auth & RBAC | SRS §3, §3.3, §6C | Low |
| [M2-master-data.md](M2-master-data.md) | Master Data | FR-10–12, FR-16 | Low |
| [M3-numbering.md](M3-numbering.md) | Ticket Numbering | FR-4, FR-5 | **Highest** |
| [M4-employee.md](M4-employee.md) | Employee Resolution | FR-13–15 | Medium |
| [M5-ticket.md](M5-ticket.md) | Ticket Encoding & Lifecycle | FR-1–3, FR-5, FR-7–9 | High |
| [M6-audit.md](M6-audit.md) | Audit Log | FR-6, FR-33–35 | Medium |
| [M7-outbox.md](M7-outbox.md) | Sync Outbox (write side) | FR-31 | High |
| [M8-sync-worker.md](M8-sync-worker.md) | Sync Worker (read side) | FR-25–32 | **Highest** |
| [M9-analytics.md](M9-analytics.md) | Analytics | FR-17–24 | Low |
| [frontend/](frontend/README.md) | Next.js web app (per-feature: auth, encode, queue, detail, employees, dashboard) | UI for FR-1–24 | Medium |

New module or frontend docs follow [`_TEMPLATE.md`](_TEMPLATE.md) (fixed section order:
Contract · API surface · Data touchpoints · Flow · Invariants · Observability · Security ·
Test matrix · Acceptance criteria).

**Related:** [API contract](../api/README.md) (FE↔BE seam) · [ADRs](../adr/README.md)
(recorded decisions) · [Deployment](../deployment.md) (Docker) ·
[Traceability matrix §5b](../12-traceability-matrix.md) (FR→module→doc→test→status).

## The five rules that cut across every guide

1. **One transaction boundary: `TicketService`.** Nothing beneath it opens its own tx.
2. **The database enforces invariants, not just the app** — `uq_ticket_seq`, `name_normalized` unique.
3. **Nothing is deleted.** `is_active` and status instead. CI greps for forbidden DELETEs.
4. **Denormalize only at the sheet boundary.**
5. **Three statuses.** Open, Ongoing, Closed. Closed is terminal.

## Blocked-on-a-decision, not on code

OPEN-1 (numbering scope), OPEN-2 (IT-Staff dashboard access), OPEN-3 (sheet hand-editing),
OPEN-4 (lookup lists). Each guide flags where it touches one. None can be resolved by
writing more code — they need the IT team.

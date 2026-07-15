# ADR-0002 — Modular monolith + one background worker; not microservices

**Status:** Accepted · **Realizes:** System Design §2 · **Diagrams:** C4 (containers), CMP

## Context

Realistic volume is tens of tickets/day and a handful of concurrent users. The design
maps cleanly onto NestJS modules/providers (M1–M9). The one genuinely different concern is
Google Sheets: slow, rate-limited, externally owned.

## Decision

Build a **modular monolith** (one NestJS API) plus **one separate worker process**
(`main.worker.ts`, same codebase). The worker drains the sync outbox to Sheets; everything
else is in the API. Not microservices.

## Consequences

- No network hops or distributed transactions between modules — the transactional outbox
  (which needs the ticket write and outbox write in one transaction) stays simple.
- Sheets latency and outages are isolated to the worker; encoding never inherits them
  (FR-29).
- Scaling headroom we won't use is traded away deliberately. Splitting later, if ever
  needed, is possible because module boundaries are already explicit (M1–M9).
- The worker shares the DB schema and image with the API; only the entrypoint differs.

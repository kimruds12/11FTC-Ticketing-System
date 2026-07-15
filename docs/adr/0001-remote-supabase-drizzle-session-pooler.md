# ADR-0001 — Remote Supabase + Drizzle over the session pooler; not supabase-js

**Status:** Accepted · **Realizes:** System Design §2.1, FR-31 · **Diagrams:** C4, ERD

## Context

The database is Supabase Postgres (given). We need multi-statement transactions: the
ticket write, the number allocation, the audit rows, and the outbox row must commit
together (FR-31, the transactional outbox). Two client choices were on the table:
`supabase-js` (PostgREST) and a direct Postgres driver.

`supabase-js` speaks PostgREST, which **cannot do multi-statement transactions** — it would
break FR-31 outright. Supabase also exposes two poolers: the transaction pooler (6543,
for serverless) and the session pooler (5432). A long-running NestJS process is not
serverless.

For environments: local Postgres would diverge from the managed Supabase Auth path (JWKS
is remote and edge-cached regardless), and a second stack to keep in sync.

## Decision

- Access Postgres with **Drizzle over a normal `pg` pool via the Supabase session pooler
  (5432)**. Do not install `supabase-js` for data access.
- Use **remote Supabase in every environment**, including local dev. No local Postgres
  container. Redis (BullMQ) is the only locally-containerized dependency in dev.

## Consequences

- Prepared statements and multi-statement transactions work; the outbox pattern is
  possible. The DB enforces invariants (`uq_ticket_seq`, `name_normalized` unique).
- Dev requires network and a shared/dev Supabase project; there is no fully-offline mode.
- Auth is identical across environments (Supabase JWKS). See `docs/deployment.md`.
- `service_role` key stays on the backend only (M1 invariant).

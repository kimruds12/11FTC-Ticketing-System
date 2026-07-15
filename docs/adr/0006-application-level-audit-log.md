# ADR-0006 — Audit at the application layer, not DB triggers

**Status:** Accepted · **Realizes:** FR-6, FR-33–35, §7 · **Diagrams:** SQ2, ERD

## Context

Every ticket change must be recorded, one row per changed field, immutably, in the same
transaction as the change. A database trigger is the obvious mechanism — and the wrong one.

## Decision

Write audit entries **at the application layer** (`AuditService.log(..., tx)`), inside the
ticket's transaction. One row per changed field. No update or delete route touches
`audit_log`.

## Consequences

- The acting user (`updated_by`) lives in the HTTP session, not the DB connection — a
  trigger cannot see it. That is the deciding reason.
- Closing an Ongoing ticket with remarks emits two rows (status + remarks), correctly.
- Immutability (FR-35) is enforced by having no mutating route and by the CI DELETE grep.
- Same-transaction guarantee (FR-34) rides on ADR-0002's single transaction boundary.

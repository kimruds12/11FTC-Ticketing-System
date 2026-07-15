# ADR-0007 — Employee de-dup via one normalize() + a unique index

**Status:** Accepted · **Realizes:** FR-13, FR-14, FR-15 · **Diagrams:** ERD, CLS

## Context

The ticket form creates employees inline. Without a guard, "Juan Dela Cruz", "juan dela
cruz", and "Juan  Dela Cruz" become three employees and per-department analytics fragment.

## Decision

- Store `name_normalized` = `lower(trim(collapse-whitespace(name)))` with a **UNIQUE**
  constraint. This is the guarantee.
- The application's `normalizeName()` must compute **exactly** that column, and be the
  single implementation (exported from `@11ftc/shared` so the web search-as-you-type uses
  the same function). Lookup-by-normalized, insert-on-miss, inside the caller's transaction.
- The UI surfaces existing matches before offering "create new" (FR-14) — a courtesy that
  stops most attempts before they reach the constraint.

## Consequences

- If `normalizeName()` and the stored column ever diverge, the unique index and the lookup
  disagree and inline creation starts producing the duplicates it exists to prevent. One
  function, one place.
- Concurrent inline creation of the same name resolves to one row (catch the unique
  violation, re-read, return the winner) — no crash surfaced to the user.

# ADR-0017 — Ticket assignment is a technician directory, not a user account

**Status:** Accepted · **Supersedes:** the `assigned_label` half of [ADR-0015](0015-one-time-legacy-sheet-import.md) · **Realizes:** FR-9, FR-19, FR-27

## Context

A ticket carried **two** assignment columns:

- `tickets.assigned_to` — a nullable FK to `users` (a sign-in account)
- `tickets.assigned_label` — free text, for the cases a single FK could not express

Against the real 280-ticket history that split badly:

| Column G on the sheet | Tickets | Stored as |
|---|---|---|
| Patrick | 104 | `assigned_label` (no account) |
| Kim/Paul | 41 | `assigned_label` (two people) |
| Paul | 30 | `assigned_label` (no account) |
| Kim/Philip | 14 | `assigned_label` (two people) |
| IT Team | 14 | `assigned_label` |
| Paul/Philip | 4 | `assigned_label` (two people) |
| Kim, Philip (matched to accounts) | 73 | `assigned_to` FK |

Three concrete problems:

1. **The same person was stored two different ways** depending on the row. "Kim" was an FK on
   73 tickets and part of a string on 55 others. Every consumer had to branch on "account or
   text?", and the two branches drifted.
2. **FR-19 "tickets by technician" was blind to 74% of the data.** It joined `users` on the FK,
   so it reported on 73 of 280 tickets and silently omitted Patrick — the busiest handler —
   entirely, because he has no login.
3. **Attribution required provisioning.** Recording that Patrick fixed something meant first
   creating a Google-allowlist account for someone who will never sign in. In the UI this was
   worse: the assignment dropdown read the admin-only `/users`, so for IT Staff — the people
   who actually encode — it was permanently empty.

Two-technician work is **21% of the history** (59 tickets). It is not an edge case, so "just
pick one person" was never available.

## Decision

Replace both columns with a **technician directory plus a join table**:

```
technicians(technician_id, name, name_normalized UNIQUE, user_id?, is_active)
ticket_assignees(ticket_id, technician_id, position)   -- composite PK
```

- **A technician is not an account.** It is a directory entry, structurally identical to
  `employees` (ADR-0013) — a name with the same `normalizeName` + unique-index dedup.
  `user_id` is an optional bridge for people who also sign in; attribution never reads it.
- **Many-to-many**, because two-person work is normal here. `position` preserves the order the
  encoder typed, so column G renders `"Kim/Paul"` and not `"Paul/Kim"`.
- **The API takes NAMES, not ids** (`assignees: string[]`). Names are what a person types, and
  a technician recorded for the first time has no id yet. `TechnicianService.resolveOrCreateMany`
  runs **inside the encode/assign transaction** (M5 is still the only transaction boundary), so a
  new technician and the ticket that introduced them commit together — exactly the pattern
  employees already use.
- **Column G stays byte-identical**: `formatAssignees` joins names with `/`, one shared function
  used by both the sheet writer and the UI.

## Consequences

- **FR-19 now covers every ticket** — 280 of 280 instead of 73. A ticket handled by two people
  credits both, so the per-technician counts legitimately sum to more than the ticket count
  (339 assignments over 280 tickets); the dashboard states this on screen.
- **Encoding no longer depends on user provisioning.** IT Staff can record any handler, and the
  assignment control works for them for the first time.
- **`normalizeName` is now load-bearing in a third place.** "Kim", "kim", and "Kim " must remain
  one technician; the unique index on `name_normalized` is the enforcement, the shared function
  is the agreement.
- **The migration is a backfill, not a reload.** `scripts/backfill-technicians.mjs` split labels
  on `/`, mapped each FK to the account's first name (the sheet's short form — using the full
  name would have rewritten column G for 73 tickets), and verified that **all 280 tickets
  re-render their original sheet string** before committing. Ticket numbers, the audit log and
  the sequence are untouched; nothing was deleted (FR-9).
- **"IT Team" stays one technician.** It is the team's own shorthand for "whoever was around".
  Expanding it into individuals would invent attribution the sheet never recorded.
- Row-level deletes in `ticket_assignees` on re-assignment are permitted and marked
  `allow-delete-scan-skip`: join rows are not history. The audit log (M6) is what records that
  assignment changed, and it is still never deleted.

## Alternatives rejected

- **Keep the FK, add accounts for everyone.** Forces logins for people who will never sign in,
  and still cannot express "Kim/Paul" in one column.
- **A single free-text field.** Simple to write, but FR-19 would have to group by string, so
  "Kim/Paul" becomes a third technician and per-person counts are impossible.
- **One FK to a technicians table (no join table).** Would make `"Kim/Paul"` a technician record
  of its own — the same grouping bug, one table later.

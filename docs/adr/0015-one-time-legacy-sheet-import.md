# ADR-0015 — One-time legacy spreadsheet import (M10), offline and file-based

**Status:** Accepted · **Realizes:** the go-live data migration (not an FR) · **Diagrams:** ERD

## Context

The department has ~6 weeks of real ticket history (282 rows, `IT-2026-0001..0286`) in the
spreadsheet they use today. The new system must contain that history, or M9 analytics starts
from zero and the tool is less useful than the sheet it replaces.

This looks like it contradicts **FR-25** ("sheet sync is one-way; no path reads ticket data
back from the sheet"). It does not — but only if the import is built a specific way.

FR-25 exists to prevent a **runtime** read path. The failure it guards against is a request
handler, months from now, treating the sheet as a source of truth and reintroducing the
silent-corruption modes ADR-0003 designed out. Loading legacy data once, before go-live, is a
different lifecycle event: it establishes what the mirror reflects. It is a migration, not a
sync.

## Decision

- **One-time, offline CLI** (`pnpm import:sheet`), not an endpoint, not a queued job, not part
  of `AppModule` or `WorkerModule`.
- **Reads a file export** (`.xlsx`/`.csv`) the operator supplies. The importer **never calls the
  Sheets API**. This is what keeps FR-25 literally true: there is still no Sheet→DB reader in
  the shipped request path, and it also sidesteps the Sheets read quota entirely.
- **`--dry-run` is the default**; `--commit` must be explicit. Because nothing is ever deleted
  (FR-9/FR-35), a bad import is permanent — the first commit runs against a database copy.
- **Two new columns on `tickets`** (migration `0003`):
  - `assigned_label` — free text for work done by more than one technician (`Kim/Paul`,
    `IT Team`), which a single `assigned_to` FK cannot express. The sheet writer emits
    `assigned_label ?? assignedToName`, so the team's column G round-trips unchanged. This is
    used instead of stuffing the value into `remarks`, which holds real troubleshooting text
    that also syncs back to the sheet.
  - `source` (`'APP' | 'IMPORT'`) — provenance.
- **Retired after go-live.** The importer is deleted rather than left in the repo as a
  Sheet-reading path someone can repurpose.

## Consequences

- FR-25 stands unmodified. The invariant that stops a future runtime Sheet read stays intact.
- **FR-23 must exclude `source = 'IMPORT'`.** The legacy sheet never recorded `ongoing_at`, so
  ~272 of 282 imported rows are `Closed` with `ongoing_at IS NULL` — which is precisely the
  first-time-fix signal. Including them reports a ~100% rate on data that carries no signal.
  Imported rows stay in FR-17/18/20/21/22, where they are legitimately useful.
- **OPEN-1 is answered by the data**: numbers are `IT-YYYY-NNNN`, so `TICKET_NUMBER_SCOPE=year`.
  `ticket_sequence` must be seeded to 286 after import or the first new encode collides with
  `UNIQUE (sequence_scope, sequence_number)`.
- **OPEN-4 is answered by the data**: the real department (22) and main-issue (7) lists are the
  distinct values in the sheet, pending IT confirmation of two likely duplicates (`Gate1`/`Gate2`,
  `IT`/`Digitech & IT`).
- Employee names are first-name-only, and 16 names appear under multiple departments (67
  tickets). Since `UNIQUE (name_normalized)` is global (ADR-0007), those are disambiguated as
  `Name (Department)` — the team's own existing `Rose (cubicle 1)` convention — rather than
  weakening the dedup constraint that ADR-0007 exists to provide.
- Imported tickets get **one `CREATE` audit row**, not a fabricated field-level history. The
  sheet records no changes; inventing them would make the audit log lie.

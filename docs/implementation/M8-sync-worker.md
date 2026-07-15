# M8 — Sync Worker (read side)

**Realizes:** FR-25–32 · **Depends on:** M7 · **Risk: HIGHEST**
**Folder:** `apps/api/src/sync/` · **Process:** `main.worker.ts` → `WorkerModule`
**Rule:** `.claude/rules/sync-worker.md` · **Diagrams:** `09-sequence-sync-worker.d2`, `03-sheets-sync.d2`

> The only module that talks to a system you don't control. It fails silently — it
> corrupts the *wrong* ticket's row, and only after the sheet has shifted.

## Contract

Drain `PENDING` outbox rows → project to sheet rows → write to `_raw` → mark `SENT`. Never
block encoding. Never duplicate a row. Never write to the wrong row.

## Files to create

```
sync/
├── worker.module.ts          (exists — booted by main.worker.ts)
├── sync.service.ts           (exists — scaffold)
├── sync.processor.ts         BullMQ processor: claim → project → write → mark
├── sheets.client.ts          googleapis wrapper (append / update / scan column B)
├── outbox.repository.ts      claim + mark SENT/FAILED (reads/writes sync_outbox)
└── sync.spec.ts              idempotency, isolation, row-identity, retry
```

## Google Cloud setup (once, out of band — System Design §6.3)

1. Enable **Google Sheets API** in a GCP project.
2. Create a **service account**, add a JSON key.
3. Share the tracker spreadsheet with the SA's `...iam.gserviceaccount.com` email as Editor.
4. Create the `_raw` tab, hide it, protect its range so only the SA writes.
5. Store the key in a secret manager (or `GOOGLE_APPLICATION_CREDENTIALS` locally — the
   file is gitignored). Prefer Workload Identity Federation in prod.

## The processing loop

- **Trigger:** BullMQ processor on the "drain" job **plus a repeatable job every minute**
  (sweeper), so a dropped dispatch is still caught. `sync_outbox.status/attempts` are the
  source of truth, not the queue.
- **Claim:** `WHERE status='PENDING' ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`
  — lets multiple workers/ticks coexist without double-processing.
- **Project (FR-27):** `employee_id`→name, `assigned_to`→name, `main_issue_id`→label. (In
  practice the payload M7 stored is already projected; re-project only if you kept IDs.)
- **Write:**
  - new row → `values.append` to `_raw`; capture the returned row index into
    `raw_row_number`.
  - existing row → `values.update` at `raw_row_number`; if missing/stale, **scan column B
    for `row_key`** and use that.
- **Mark:** `SENT` + `sent_at`. On error: `attempts++`, exponential backoff, `FAILED` after
  5, surfaced in Bull Board.

## Invariants

1. **Locate rows by `row_key`, never by remembered position.** The visible sheet is
   newest-first, so a stored index is stale the moment the next ticket is encoded — the
   write would land on *another ticket's row*. This is the silent-corruption bug rev 1 had.
2. **`_raw` is append-only** — rows never shift, so a cached `raw_row_number` stays valid
   forever. That property is the entire justification for splitting storage (`_raw`) from
   presentation (the `Tickets` QUERY view).
3. **One-way only** (FR-25). No path reads ticket data back from the sheet.
4. **Idempotent** (FR-30). A retried row updates; it never appends a second copy.
5. **Sync failure never fails encoding** (FR-29). Break the Google credentials → encoding
   still succeeds; rows pile up as `PENDING`.
6. **Denormalize at the boundary.** IDs stay in Postgres.

## Watch-outs

- Sheets allows ~60 writes/min/user → batch 100 rows per call (`values.batchUpdate`).
  Matters most during the historical backfill (which runs through this same path, not a
  one-off script).
- The `Tickets` tab is a QUERY view and therefore **read-only** — **OPEN-3**. If the IT
  team must keep hand-editing it, the fallback is `InsertDimensionRequest` + developer
  metadata pinned per row. **Never** fall back to a bare stored row index.

## API surface

**No HTTP surface.** The worker is a separate process (`main.worker.ts`) driven by BullMQ.
Operational visibility is the **Bull Board** UI (mount it in the worker), not a REST API.

## Observability

- **Measure** PENDING and FAILED outbox counts, per-row write latency, and the Sheets 429
  rate. FAILED > 0 or PENDING climbing are the two alerts that matter.
- **Log** each send with `row_key`, `raw_row_number` (append vs update), attempt number,
  and outcome. On failure, capture `last_error`.
- **This is the module most likely to fail silently** — it corrupts the wrong row after the
  sheet shifts. Row-identity logging (which `row_key` mapped to which `raw_row_number`) is
  what makes a mislocation debuggable after the fact.

## Security

- The Google service-account key stays on the backend only; prefer Workload Identity
  Federation in prod over a downloaded key file. The `_raw` tab is protected so only the
  service account writes.
- One-way only (FR-25): no code path reads ticket data back from the sheet.

## Acceptance criteria

- FR-25/26/27/28: one-way, existing columns, FK→name projection, newest-first preserved.
- FR-29: a Sheets/credentials outage never fails encoding.
- FR-30: idempotent — a retried row updates, never duplicates.
- FR-32: backfill runs through this same path, not a one-off script.

## Tests that gate merge

- **Idempotency:** run the same outbox row twice → one sheet row.
- **Isolation:** break the Google credentials → encoding still succeeds.
- **Row identity:** insert a ticket at the top, then update an older ticket → the correct
  row changes.
- Rate-limit 429 → backoff, retry, eventual success.
- 5 failures → `FAILED` + surfaced in Bull Board.

# Frontend — Analytics dashboard

**Realizes:** FR-17–24 · **Backend:** M9 · **Route:** `(app)/dashboard`

## Component contract

- `PeriodPicker` — daily / weekly / monthly window; drives the `from`/`to` params.
- Charts: `VolumeChart` (FR-17), `ByDimension` (department/technician/category, FR-18–20),
  `SolvedChart` (FR-21, by `closed_at`), `StatusBreakdown` (FR-22), `FirstTimeFixRate`
  (FR-23), `OngoingAgeing` (FR-24).
- Each chart is a dumb presenter — it receives already-aggregated data from the API.

## Data / API

- Server Component reads the `GET /analytics/*` endpoints (M9) with the window. All
  aggregation is server-side; the client never computes metrics.
- **Labelling matters:** volume is "tickets", not "distinct problems" (a recurrence is a new
  ticket). Do not label FR-17 as a problem count. "Solved this period" (FR-21) is a different
  set from "reported this period" — keep them visually distinct.

## States

- Loading skeletons per chart, empty ("no data for this period"), error (retry). Charts
  render independently so one slow endpoint doesn't block the rest.

## RBAC

- Admin always. IT-Staff access is **OPEN-2** — gate the route behind one flag.

## Accessibility

- Charts need text/table equivalents or `aria` summaries; never rely on color alone to
  distinguish series.

## Acceptance criteria

- FR-17–24 each render correctly over the selected window.
- FR-21 is bucketed by `closed_at`; first-time-fix (FR-23) excludes tickets that went Ongoing.
- No metric is mislabelled as a count of distinct problems.

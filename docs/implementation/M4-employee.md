# M4 — Employee Resolution

**Realizes:** FR-13, FR-14, FR-15 · **Depends on:** M2 · **Risk:** Medium
**Folder:** `apps/api/src/employee/`

## Contract

```ts
resolveOrCreate(name: string, departmentId: string, tx: Tx): Employee
```

Returns the existing employee or creates one, **without ever creating a near-duplicate**.

## The one function that matters

```ts
// This EXACT function must also be what computes the stored name_normalized column.
export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}
```

`resolveOrCreate`:

```ts
const normalized = normalizeName(name);
const found = await tx.select().from(employees).where(eq(employees.nameNormalized, normalized)).limit(1);
if (found.length) return found[0];
try {
  const [row] = await tx.insert(employees).values({ name: name.trim(), nameNormalized: normalized, departmentId }).returning();
  return row;
} catch (e) {
  if (isUniqueViolation(e)) {
    // Concurrent inline creation of the same name — re-read, return the winner. No crash to the user.
    return (await tx.select()…where(eq(employees.nameNormalized, normalized)).limit(1))[0];
  }
  throw e;
}
```

## Invariants

1. **`normalizeName()` is the single source of truth for `name_normalized`.** The DB
   column, the lookup, and any migration/backfill must all run this same function. If they
   diverge, the unique index and the lookup disagree, and inline creation starts producing
   the very duplicates it exists to prevent. **One function, one place** — export it from
   `@11ftc/shared` so the web app's search-as-you-type uses it too.
2. **The unique index (`name_normalized UNIQUE`) is the guarantee.** FR-14's UI is a
   courtesy that stops most attempts before they reach it — not the safety net.

## FR-14 UI note

The web form searches existing employees as the user types (calling a read endpoint that
normalizes the query the same way) and surfaces matches **before** offering "create new".
See `frontend/encode.md`.

## API surface

| Method + path | Purpose | Auth |
|---|---|---|
| `GET /employees/search?q=` | Search-as-you-type; normalizes `q` the same way (FR-14) | any role |

Inline creation happens **inside the encode transaction** (M5), not via a standalone
endpoint — so a new employee and the ticket that introduced them commit together. DTOs in
`@11ftc/shared/dto/employee.dto.ts`; `normalizeName` is exported from `@11ftc/shared`.

## Observability

- **Log** inline creations (name, department, actor) — it's how new employees enter the
  system.
- **Measure** the unique-violation retry rate. A nonzero-but-small rate is healthy (the
  guard working under concurrency); a spike suggests the UI isn't surfacing matches (FR-14).

## Security

- Bound `name` length; `normalizeName` before store and before lookup — the same function.
- Department must reference an existing active lookup.

## Acceptance criteria

- FR-15: the three casings resolve to one row.
- FR-13/14: inline create works within encode; matches surface before "create new".

## Tests that gate merge

- `"Juan Dela Cruz"`, `"juan dela cruz"`, `"Juan  Dela Cruz"` → one employee row.
- Concurrent inline creation of the same name → one row, no unique-violation crash
  surfaced to the user.

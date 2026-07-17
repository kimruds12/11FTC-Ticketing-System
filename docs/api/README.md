# API contract — the frontend ↔ backend seam

This directory holds the **HTTP contract** that the web app and the API agree on. It is the
concrete alignment mechanism between frontend and backend: one source of truth, consumed by
both, checked by types.

> **Versioning:** every route is URI-versioned under `/api/v1` and each module carries a
> semver — see [versioning.md](versioning.md) (ADR-0012). Paths below are shown without the
> `/api/v1` prefix for brevity.

## How alignment is guaranteed (not just documented)

```
packages/shared/src/dto/*.ts   ← Zod schemas = source of truth
        │
        ├─▶ backend (apps/api): validates every request/response against the schema
        ├─▶ frontend (apps/web): imports the inferred types + validates forms with the schema
        └─▶ docs/api/openapi.json: generated from the Nest controllers + schemas
```

- A contract change edits **one** Zod schema. Both apps recompile against it in the same
  PR — a mismatch is a type error, not a runtime surprise found in UAT.
- The frontend never hand-writes request shapes; it imports them from `@11ftc/shared`.
- The rendered OpenAPI is a **read view** of the contract for humans and external tools —
  it is generated, never hand-edited.

## Generating `openapi.json`

The API uses `@nestjs/swagger`. Once controllers and DTOs exist (per module), wire the
document factory in `apps/api/src/main.ts`:

```ts
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
// ...
const config = new DocumentBuilder()
  .setTitle("11FTC Ticketing API")
  .setVersion("1.0")
  .addBearerAuth() // Supabase session JWT
  .build();
const doc = SwaggerModule.createDocument(app, config);
SwaggerModule.setup("docs/api", app, doc); // served at /docs/api in non-prod
```

Add a script (`apps/api`) that boots the app in "emit" mode and writes
`docs/api/openapi.json` for committing, so the contract is reviewable in diffs. Until the
modules land, this directory holds the contract *approach*; the JSON appears with the first
controller.

## Per-module contract surface

Each module's implementation guide (`docs/implementation/Mn-*.md`) has an **API surface**
section listing its endpoints, the DTOs (from `@11ftc/shared`), and error cases. Those are
the human-readable slices; this OpenAPI doc is the machine-readable whole.

| Area | Module | DTO file (in `@11ftc/shared/dto`) |
|---|---|---|
| Auth / session | M1 | `auth.dto.ts` |
| Lookups & users | M2 | `master-data.dto.ts` |
| Employees | M4 | `employee.dto.ts` |
| Tickets (encode/update/assign/close/list) | M5 | `ticket.dto.ts` |
| Ticket history | M6 | `audit.dto.ts` |
| Analytics | M9 | `analytics.dto.ts` |

> Numbering (M3), outbox (M7), and the sync worker (M8) have **no public HTTP surface** —
> they are internal to `TicketService` and the worker process.

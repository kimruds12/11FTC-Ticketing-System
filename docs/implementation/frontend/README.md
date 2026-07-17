# Frontend implementation guides (apps/web)

**Stack:** Next.js (App Router), TypeScript strict, Tailwind. **Depends on:** the NestJS API
for everything. One doc per feature, each mirroring the backend module(s) and FRs it
realizes — so the FE↔BE mapping is one-to-one and auditable.

| Guide | Screen | Realizes | Backend |
|---|---|---|---|
| [auth.md](auth.md) | Sign in, session, route protection | SRS §3, §3.3 | M1 |
| [encode.md](encode.md) | Encode ticket form | FR-1, FR-2, FR-5, FR-13, FR-14 | M5, M4, M3 |
| [queue.md](queue.md) | Ticket queue + filters | FR-3 | M5 |
| [detail.md](detail.md) | Ticket detail, edit, history | FR-1, FR-6, FR-7, FR-8 | M5, M6 |
| [employees.md](employees.md) | Employee management | FR-10–12, FR-16 | M2, M4 |
| [dashboard.md](dashboard.md) | Analytics dashboard | FR-17–24 | M9 |

## The one rule (applies to every guide)

**The web app carries NO business logic.** The state machine, RBAC, ticket numbering, and
employee de-duplication are enforced **server-side**. The UI mirrors those rules for
usability (disabling an illegal transition, hiding an admin button) but never *is* the
rule — a form that lets you pick an illegal status must still be rejected by the API, and
tested that way. If you're encoding domain logic here, it belongs in `apps/api`.

## Shared conventions (don't repeat them per feature)

- **Contract:** import DTOs, enums, and `normalizeName` from `@11ftc/shared`. Never redefine
  `TicketStatus`, `UserRole`, or the normalize function. Validate forms with the same Zod
  schema the API validates against (`docs/api/README.md`).
- **Auth:** Supabase Auth with the **anon key only**; attach the session JWT as
  `Authorization: Bearer` on every API call (the API verifies via JWKS). See `auth.md`.
- **Architecture:** the folder/layer structure, state model, and data-flow patterns are
  defined once in [architecture.md](architecture.md) (ADR-0011). Read it before building any
  screen — it says *where* every piece below lives.
- **Data fetching:** Server Components for reads (queue, detail, dashboard) using the user's
  session; Client Components for interactive forms/comboboxes. HTTP goes through the **Axios
  services** in `src/services/` (never `fetch` scattered in components); mutations go through
  **Server Actions** that call those services. Client-only cross-cutting state
  (session/role, UI, filters) lives in **Redux Toolkit** — never server data.
- **RBAC:** hide admin-only UI by role, but treat it as **cosmetic** — the API's `RolesGuard`
  is the real gate.
- **States:** every data view has explicit loading / empty / error states.
- **Accessibility:** run each screen against `.claude/references/accessibility-checklist.md`
  (labels on inputs, focus management in the combobox/dialogs, keyboard paths).

## Route layout

```
app/
├── (auth)/sign-in/page.tsx
└── (app)/
    ├── layout.tsx                server session check; role in context
    ├── tickets/
    │   ├── page.tsx              queue + filters      → queue.md
    │   ├── new/page.tsx          encode form          → encode.md
    │   └── [ticketId]/page.tsx   detail + edit + audit → detail.md
    ├── employees/page.tsx        admin                → employees.md
    └── dashboard/page.tsx        analytics            → dashboard.md
```

## Do not

- Talk to Postgres or Sheets from the web app — everything goes through the API.
- Add a "delete ticket" button — there is no delete path (FR-9).
- Seed dropdowns with placeholder lookups — they come from the API (OPEN-4).

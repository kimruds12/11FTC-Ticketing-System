# Shared DTOs — the frontend ↔ backend contract

Request/response shapes live here as **Zod schemas**, and the inferred TypeScript types are
exported from them. This package is the single source of truth for the API contract:

```
Zod schema (here)  ──infer──▶  TS type (FE + BE both import)
      │
      └── the API validates every request/response against it
      └── the API's OpenAPI doc is generated from it (see docs/api/)
```

Because both sides import the *same* schema, the frontend cannot send a shape the backend
won't accept, and a contract change is a type error on both sides in the same PR — that is
the alignment mechanism, not a doc that goes stale.

## Conventions

- One file per module's contract: `ticket.dto.ts`, `employee.dto.ts`, `analytics.dto.ts`, …
  mirroring M1–M9.
- Name schemas `EncodeTicketSchema`; export the type as `EncodeTicketInput`
  (`z.infer<typeof EncodeTicketSchema>`).
- Reuse the enums from `../enums.ts` (`TicketStatus`, `UserRole`, …) — never redefine them.
- No NestJS or Next.js imports here. Pure Zod + types, so both apps can depend on it.

Scaffold only — schemas are added per module as those modules are built. See
`docs/api/README.md` for how the OpenAPI document is produced from these.

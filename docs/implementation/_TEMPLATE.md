# Mn — <Module name>

**Realizes:** <FR-x..y, SRS §> · **Depends on:** <modules> · **Risk:** <Low/Med/High>
**Folder:** `apps/api/src/<folder>/` · **Rule:** `.claude/rules/<rule>.md` (if any)
**Diagrams:** `docs/diagrams/<...>.d2` · **ADR:** `docs/adr/<...>.md` (if any)

> Standard section order for every module guide. Backend and frontend docs share this
> shape so a reviewer can diff any two modules and requirements map straight through. Keep
> each section short; link out rather than duplicate the SRS or the module spec.

## Contract
What the module guarantees, in one or two sentences (the signature or boundary).

## API surface
Endpoints (method + path), the request/response DTOs from `@11ftc/shared/dto`, and the
error cases (status + when). Modules with no HTTP surface (M3/M7/M8) say so and give the
internal call signature instead.

## Data touchpoints
Tables/columns read and written (link the ERD). Note any constraint the module relies on.

## Flow
Link the sequence/state diagram and describe the happy path + the one dangerous edge.

## Invariants
The non-negotiables (from the module spec). These are contracts, not suggestions.

## Observability
What to log (structured fields), what to measure (metric + why), what to trace. What a
silent failure would look like and how it becomes visible. (See
`.claude/references/observability-checklist.md`.)

## Security
AuthN/AuthZ (which `@Roles`), input validation, data exposure, secrets. What must never
leave the backend. (See `.claude/references/security-checklist.md`.)

## Test matrix → gating tests
Table: scenario → expectation → test file. The "tests that gate merge" from the module
spec, made concrete against files.

## Acceptance criteria
Bullet list tied to FRs — the definition of done for this module. Each maps to a row in the
traceability matrix. (See `.claude/references/definition-of-done.md`.)

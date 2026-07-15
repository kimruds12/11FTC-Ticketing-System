# M6 — Audit Log

**Realizes:** FR-6, FR-33–35, §7 · **Depends on:** M1 · **Risk:** Medium
**Folder:** `apps/api/src/audit/`

## Contract

```ts
log(action: AuditAction, ticketId: string, changes: FieldChange[], actor: AuthContext, tx: Tx): void
```

One row **per changed field**, in the caller's transaction.

```ts
type FieldChange = { fieldName: string; previousValue: string | null; newValue: string | null };
```

## Implementation

```ts
async log(action, ticketId, changes, actor, tx) {
  if (!changes.length) return;
  await tx.insert(auditLog).values(
    changes.map((c) => ({
      ticketId, action, fieldName: c.fieldName,
      previousValue: c.previousValue, newValue: c.newValue,
      updatedBy: actor.userId,
    })),
  );
}
```

The caller (M5) computes `changes` by diffing the row before/after. Actions: CREATE,
UPDATE, ASSIGN, STATUS_CHANGE, CLOSE.

## Invariants

1. **Triggers cannot do this job.** The acting user (`updated_by`) lives in the HTTP
   session, not the database connection. That is *the* reason this is application-level.
2. **One row per field** (FR-33). Closing an Ongoing ticket with remarks emits two rows
   (status change + remarks), not one.
3. **Immutable** (FR-35). No update or delete route touches `audit_log`. CI greps for
   DELETEs against it.
4. **Same transaction as the change it describes** (FR-34). It takes `tx`; it never opens
   its own.

## API surface

**No write endpoint.** `AuditService.log(...)` is called only by `TicketService` inside its
transaction. Reads are served through M5's `GET /tickets/:id` (history). There is
deliberately no route that mutates or deletes an audit row.

## Observability

- The audit log **is** the observability surface for ticket changes — one row per changed
  field is the record of what happened and who did it.
- **Measure** audit rows per mutation as a sanity signal; a mutation that produced zero
  rows means a diff was missed.

## Security

- Immutable (FR-35): no update/delete route; `check:no-delete` guards `audit_log`.
- `updated_by` comes from the verified session (M1), never from the request body.

## Acceptance criteria

- FR-6/33: one row per changed field, on every ticket change.
- FR-34: written in the same transaction as the change.
- FR-35: no route can alter or remove an entry.

## Tests that gate merge

- Close-with-remarks → exactly two audit rows, correct `previous_value`/`new_value`.
- No route mutates or deletes an audit row.

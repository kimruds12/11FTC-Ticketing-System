import { Module } from "@nestjs/common";
import { AuditService } from "./audit.service.js";

/**
 * M6 — Audit Log. log(action, ticketId, changes[], actor, tx) — one row PER changed
 * field, application-level (not DB triggers), in the caller's transaction. Immutable.
 * Scaffold only — see docs/implementation/M6-audit.md.
 */
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

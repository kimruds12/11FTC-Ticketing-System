import { Module } from "@nestjs/common";
import { AuditController } from "./audit.controller.js";
import { AuditService } from "./audit.service.js";

/**
 * M6 — Audit Log. log(action, ticketId, changes[], actor, tx) — one row PER changed
 * field, application-level (not DB triggers), in the caller's transaction. Immutable.
 * Also serves the admin-only cross-ticket feed (FR-40) — see docs/implementation/M6-audit.md.
 */
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

import { Controller, Get, Query } from "@nestjs/common";
import {
  auditLogQuerySchema,
  UserRole,
  type AuditLogListResult,
  type AuditLogQuery,
} from "@11ftc/shared";
import { Roles } from "../auth/roles.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { AuditService } from "./audit.service.js";

/**
 * M6 — the cross-ticket audit feed (FR-40).
 *
 * **IT Administrator only**, confirmed with the department: monitoring who changed what is
 * an oversight function, not part of encoding. That is enforced HERE, by the guard — the
 * sidebar hiding the link is cosmetic and is not a boundary (ADR-0011).
 *
 * READ ONLY, and there is deliberately no POST, PATCH or DELETE on this controller. Audit
 * entries are immutable (FR-35); they are written only as a side effect of the change they
 * describe, inside that change's transaction (FR-34). A route that could edit one would make
 * the log unable to serve its purpose.
 */
@Roles(UserRole.IT_ADMINISTRATOR)
@Controller({ path: "audit-logs", version: "1" })
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(auditLogQuerySchema)) query: AuditLogQuery,
  ): Promise<AuditLogListResult> {
    return this.audit.list(query);
  }
}

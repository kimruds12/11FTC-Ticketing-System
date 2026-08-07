import type { AxiosInstance } from "axios";
import type { AuditLogListResult, AuditLogQuery } from "@11ftc/shared";

/**
 * Audit transport (M6, FR-40). Read-only by design — audit entries are immutable (FR-35)
 * and are written only as a side effect of the change they describe, so there is no create,
 * update or delete call to write here.
 *
 * The endpoint is IT Administrator only; a non-admin session gets a 403 from the API's
 * RolesGuard, which is the actual boundary.
 */
export const auditService = (api: AxiosInstance) => ({
  async list(query: Partial<AuditLogQuery> = {}): Promise<AuditLogListResult> {
    const { data } = await api.get<AuditLogListResult>("/audit-logs", {
      params: {
        q: query.q,
        action: query.action,
        updatedBy: query.updatedBy,
        ticketId: query.ticketId,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        limit: query.limit,
        offset: query.offset,
      },
    });
    return data;
  },
});

export type AuditService = ReturnType<typeof auditService>;

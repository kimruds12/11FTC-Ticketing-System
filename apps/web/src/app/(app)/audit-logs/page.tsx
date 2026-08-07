import { AuditAction, type AuditLogListResult } from "@11ftc/shared";
import { serverApi } from "@/services/server";
import { auditService } from "@/services/audit.service";
import { AppError } from "@/services/errors";
import AuditLogClient, { type AuditFilterValues } from "@/features/audit/AuditLogClient";

/**
 * Audit Logs (M6, FR-40). Server-fetches a filtered page from the API; the client shell owns
 * only the interactive filter state.
 *
 * Access is IT Administrator only, and the API's RolesGuard is what enforces it — a 403 is
 * caught below and surfaced as a message rather than a crashed page. The sidebar hiding the
 * link is cosmetic (ADR-0011).
 *
 * Filters arrive as URL params and are validated here before being forwarded, because the API
 * schema is strict: a stale or hand-edited URL must not turn into a 400 for the whole page.
 */
const DEFAULT_LIMIT = 50;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function isAction(value: string): boolean {
  return (Object.values(AuditAction) as string[]).includes(value);
}

function toInt(value: string, fallback: number): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const sp = await searchParams;

  const action = one(sp.action);
  const dateFrom = one(sp.dateFrom);
  const dateTo = one(sp.dateTo);

  const filters: AuditFilterValues = {
    q: one(sp.q),
    action: isAction(action) ? action : "",
    dateFrom: ISO_DATE.test(dateFrom) ? dateFrom : "",
    dateTo: ISO_DATE.test(dateTo) ? dateTo : "",
  };

  const limit = Math.min(Math.max(toInt(one(sp.limit), DEFAULT_LIMIT), 1), 200);
  const offset = toInt(one(sp.offset), 0);

  let result: AuditLogListResult = { items: [], total: 0 };
  let loadError: string | null = null;

  try {
    result = await auditService(serverApi()).list({
      q: filters.q || undefined,
      action: (filters.action || undefined) as AuditLogListResult["items"][number]["action"] | undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      limit,
      offset,
    });
  } catch (error) {
    loadError =
      error instanceof AppError && error.status === 403
        ? "audit logs are available to IT Administrators only"
        : error instanceof AppError
          ? error.message
          : "the API is unreachable";
  }

  return (
    <AuditLogClient
      entries={result.items}
      total={result.total}
      limit={limit}
      offset={offset}
      initialFilters={filters}
      loadError={loadError}
    />
  );
}

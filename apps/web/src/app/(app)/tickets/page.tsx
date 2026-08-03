import {
  TicketStatus,
  type DepartmentDto,
  type MainIssueDto,
  type TechnicianDto,
} from "@11ftc/shared";
import { serverApi } from "@/services/server";
import { ticketsService, type TicketListParams } from "@/services/tickets.service";
import { lookupsService } from "@/services/lookups.service";
import { techniciansService } from "@/services/technicians.service";
import { AppError } from "@/services/errors";
import TicketQueueClient from "@/features/tickets/TicketQueueClient";
import type { TicketFilterValues } from "@/features/tickets/TicketFilters";
import type { TicketListResult } from "@11ftc/shared";

/**
 * Ticket Queue (M5 read path, FR-3). Server-fetches the filtered page from the API plus the M2
 * lookups that populate the dropdowns; the client shell owns only the interactive filter state.
 *
 * Filters arrive as URL params. They are validated here before being forwarded because the API
 * schema is strict — a stale or hand-edited URL must not turn into a 400 for the whole page.
 */
const DEFAULT_LIMIT = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function isStatus(value: string): value is TicketStatus {
  return (Object.values(TicketStatus) as string[]).includes(value);
}

function toInt(value: string, fallback: number): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export default async function TicketQueuePage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const sp = await searchParams;

  // Keep only values the API will accept; anything else is dropped rather than forwarded.
  const status = one(sp.status);
  const departmentId = one(sp.departmentId);
  const mainIssueId = one(sp.mainIssueId);
  const technicianId = one(sp.technicianId);
  const dateFrom = one(sp.dateFrom);
  const dateTo = one(sp.dateTo);
  const q = one(sp.q);

  const filters: TicketFilterValues = {
    q,
    status: isStatus(status) ? status : "",
    departmentId: UUID.test(departmentId) ? departmentId : "",
    mainIssueId: UUID.test(mainIssueId) ? mainIssueId : "",
    technicianId: UUID.test(technicianId) ? technicianId : "",
    dateFrom: ISO_DATE.test(dateFrom) ? dateFrom : "",
    dateTo: ISO_DATE.test(dateTo) ? dateTo : "",
  };

  const limit = Math.min(Math.max(toInt(one(sp.limit), DEFAULT_LIMIT), 1), 200);
  const offset = toInt(one(sp.offset), 0);

  const query: TicketListParams = { limit, offset };
  if (filters.q) query.q = filters.q;
  if (filters.status) query.status = filters.status as TicketStatus;
  if (filters.departmentId) query.departmentId = filters.departmentId;
  if (filters.mainIssueId) query.mainIssueId = filters.mainIssueId;
  if (filters.technicianId) query.technicianId = filters.technicianId;
  if (filters.dateFrom) query.dateFrom = filters.dateFrom;
  if (filters.dateTo) query.dateTo = filters.dateTo;

  const api = serverApi();
  let result: TicketListResult = { items: [], total: 0 };
  let departments: DepartmentDto[] = [];
  let mainIssues: MainIssueDto[] = [];
  let technicians: TechnicianDto[] = [];
  let loadError: string | null = null;

  try {
    [result, departments, mainIssues, technicians] = await Promise.all([
      ticketsService(api).list(query),
      lookupsService(api).listDepartments(),
      lookupsService(api).listMainIssues(),
      techniciansService(api).list(),
    ]);
  } catch (error) {
    loadError = error instanceof AppError ? error.message : "the API is unreachable";
  }

  return (
    <TicketQueueClient
      tickets={result.items}
      total={result.total}
      limit={limit}
      offset={offset}
      initialFilters={filters}
      departments={departments}
      mainIssues={mainIssues}
      technicians={technicians}
      loadError={loadError}
    />
  );
}

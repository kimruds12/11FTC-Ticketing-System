"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  DepartmentDto,
  MainIssueDto,
  TechnicianDto,
  TicketDto,
} from "@11ftc/shared";
import { useDebounce } from "@/hooks/useDebounce";
import TicketFilters, { type TicketFilterValues } from "./TicketFilters";
import TicketTable from "./TicketTable";

/**
 * Client shell for the ticket queue. Owns the interactive filter state and mirrors it into the
 * URL; the server component reads those params and re-fetches, so **filtering and paging happen
 * on the API** (FR-3) rather than over a partial page of rows.
 */
interface TicketQueueClientProps {
  tickets: TicketDto[];
  total: number;
  limit: number;
  offset: number;
  initialFilters: TicketFilterValues;
  departments: DepartmentDto[];
  mainIssues: MainIssueDto[];
  technicians: TechnicianDto[];
  loadError: string | null;
}

const EMPTY_FILTERS: TicketFilterValues = {
  q: "",
  status: "",
  departmentId: "",
  mainIssueId: "",
  technicianId: "",
  dateFrom: "",
  dateTo: "",
};

function buildQuery(filters: TicketFilterValues, offset: number, limit: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (offset > 0) params.set("offset", String(offset));
  if (limit !== 50) params.set("limit", String(limit));
  return params.toString();
}

export default function TicketQueueClient({
  tickets,
  total,
  limit,
  offset,
  initialFilters,
  departments,
  mainIssues,
  technicians,
  loadError,
}: TicketQueueClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<TicketFilterValues>(initialFilters);
  const [pageOffset, setPageOffset] = useState(offset);

  // Only the free-text box is debounced; dropdowns and dates apply immediately.
  const debouncedQ = useDebounce(filters.q, 350);

  const targetQuery = useMemo(
    () => buildQuery({ ...filters, q: debouncedQ }, pageOffset, limit),
    [filters, debouncedQ, pageOffset, limit],
  );

  useEffect(() => {
    const current = buildQuery({ ...initialFilters }, offset, limit);
    if (targetQuery === current) return;
    router.replace(targetQuery ? `${pathname}?${targetQuery}` : pathname, { scroll: false });
  }, [targetQuery, initialFilters, offset, limit, pathname, router]);

  /** Any filter change resets to the first page — page 3 of the old result set is meaningless. */
  function handleFilterChange(patch: Partial<TicketFilterValues>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPageOffset(0);
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS);
    setPageOffset(0);
  }

  return (
    <div className="space-y-6 w-full px-4 md:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Ticket Queue
          </h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">
            Search, filter, and review encoded tickets.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Could not load tickets: {loadError}
        </div>
      )}

      <TicketFilters
        values={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
        departments={departments}
        mainIssues={mainIssues}
        technicians={technicians}
      />

      <TicketTable
        tickets={tickets}
        total={total}
        limit={limit}
        offset={offset}
        onPageChange={setPageOffset}
      />
    </div>
  );
}

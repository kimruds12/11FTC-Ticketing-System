import type { AxiosInstance } from "axios";

/**
 * Analytics transport (M9). Read-only aggregates computed server-side (no client-side
 * aggregation — that would be business logic in the web app).
 *
 * INTERIM TYPES: replace with the M9 DTOs from @11ftc/shared when they exist.
 */
export interface DashboardSummary {
  openCount: number;
  ongoingCount: number;
  closedCount: number;
  byMainIssue: { label: string; count: number }[];
}

export const dashboardService = (api: AxiosInstance) => ({
  async summary(): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>("/analytics/summary");
    return data;
  },
});

export type DashboardService = ReturnType<typeof dashboardService>;

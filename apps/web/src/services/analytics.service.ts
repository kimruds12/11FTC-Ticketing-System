import type { AxiosInstance } from "axios";
import type {
  AnalyticsWindow,
  CountPoint,
  CoverageDto,
  DatePoint,
  FirstTimeFixDto,
  OngoingAgeingItem,
  ReportMatrixDto,
  ReportQuery,
  StatusCounts,
} from "@11ftc/shared";

/**
 * Analytics transport (M9). Read-only aggregates for the dashboard.
 *
 * `granularity` is forwarded so the same window can be read daily, weekly, or monthly —
 * the API buckets with `date_trunc`, never a rolling offset from "now".
 */
export const analyticsService = (api: AxiosInstance) => {
  const p = (w: Partial<AnalyticsWindow>) => ({
    params: { from: w.from, to: w.to, granularity: w.granularity },
  });
  return {
    async status(): Promise<StatusCounts> {
      return (await api.get<StatusCounts>("/analytics/status")).data;
    },
    async volume(w: Partial<AnalyticsWindow> = {}): Promise<DatePoint[]> {
      return (await api.get<DatePoint[]>("/analytics/volume", p(w))).data;
    },
    async solved(w: Partial<AnalyticsWindow> = {}): Promise<DatePoint[]> {
      return (await api.get<DatePoint[]>("/analytics/solved", p(w))).data;
    },
    async byDepartment(w: Partial<AnalyticsWindow> = {}): Promise<CountPoint[]> {
      return (await api.get<CountPoint[]>("/analytics/by-department", p(w))).data;
    },
    async byTechnician(w: Partial<AnalyticsWindow> = {}): Promise<CountPoint[]> {
      return (await api.get<CountPoint[]>("/analytics/by-technician", p(w))).data;
    },
    async byCategory(w: Partial<AnalyticsWindow> = {}): Promise<CountPoint[]> {
      return (await api.get<CountPoint[]>("/analytics/by-category", p(w))).data;
    },
    async firstTimeFix(w: Partial<AnalyticsWindow> = {}): Promise<FirstTimeFixDto> {
      return (await api.get<FirstTimeFixDto>("/analytics/first-time-fix", p(w))).data;
    },
    async ongoingAgeing(): Promise<OngoingAgeingItem[]> {
      return (await api.get<OngoingAgeingItem[]>("/analytics/ongoing-ageing")).data;
    },
    /** FR-37 — full encoded date range, unfiltered. Builds the report period picker. */
    async coverage(): Promise<CoverageDto> {
      return (await api.get<CoverageDto>("/analytics/coverage")).data;
    },
    /** FR-36 — the report cross-tab: departments down, periods across. */
    async report(q: Partial<ReportQuery> = {}): Promise<ReportMatrixDto> {
      return (
        await api.get<ReportMatrixDto>("/analytics/report", {
          params: {
            from: q.from,
            to: q.to,
            granularity: q.granularity,
            departmentId: q.departmentId,
            mainIssueId: q.mainIssueId,
          },
        })
      ).data;
    },
  };
};

export type AnalyticsService = ReturnType<typeof analyticsService>;

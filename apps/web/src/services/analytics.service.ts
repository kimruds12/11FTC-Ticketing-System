import type { AxiosInstance } from "axios";
import type {
  AnalyticsWindow,
  CountPoint,
  DatePoint,
  FirstTimeFixDto,
  OngoingAgeingItem,
  StatusCounts,
} from "@11ftc/shared";

/** Analytics transport (M9). Read-only aggregates for the dashboard. */
export const analyticsService = (api: AxiosInstance) => {
  const p = (w: AnalyticsWindow) => ({ params: { from: w.from, to: w.to } });
  return {
    async status(): Promise<StatusCounts> {
      return (await api.get<StatusCounts>("/analytics/status")).data;
    },
    async volume(w: AnalyticsWindow = {}): Promise<DatePoint[]> {
      return (await api.get<DatePoint[]>("/analytics/volume", p(w))).data;
    },
    async solved(w: AnalyticsWindow = {}): Promise<DatePoint[]> {
      return (await api.get<DatePoint[]>("/analytics/solved", p(w))).data;
    },
    async byDepartment(w: AnalyticsWindow = {}): Promise<CountPoint[]> {
      return (await api.get<CountPoint[]>("/analytics/by-department", p(w))).data;
    },
    async byTechnician(w: AnalyticsWindow = {}): Promise<CountPoint[]> {
      return (await api.get<CountPoint[]>("/analytics/by-technician", p(w))).data;
    },
    async byCategory(w: AnalyticsWindow = {}): Promise<CountPoint[]> {
      return (await api.get<CountPoint[]>("/analytics/by-category", p(w))).data;
    },
    async firstTimeFix(w: AnalyticsWindow = {}): Promise<FirstTimeFixDto> {
      return (await api.get<FirstTimeFixDto>("/analytics/first-time-fix", p(w))).data;
    },
    async ongoingAgeing(): Promise<OngoingAgeingItem[]> {
      return (await api.get<OngoingAgeingItem[]>("/analytics/ongoing-ageing")).data;
    },
  };
};

export type AnalyticsService = ReturnType<typeof analyticsService>;

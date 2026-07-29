import { Controller, Get, Query } from "@nestjs/common";
import {
  analyticsWindowSchema,
  UserRole,
  type AnalyticsWindow,
  type CountPoint,
  type DatePoint,
  type FirstTimeFixDto,
  type OngoingAgeingItem,
  type StatusCounts,
} from "@11ftc/shared";
import { Roles } from "../auth/roles.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { AnalyticsService } from "./analytics.service.js";

/**
 * M9 — Analytics (read-only). OPEN-2: whether IT_STAFF may view the dashboard is unconfirmed
 * — both roles are allowed for now; to restrict to admin, drop `IT_STAFF` from this one line.
 */
@Roles(UserRole.IT_ADMINISTRATOR, UserRole.IT_STAFF)
@Controller({ path: "analytics", version: "1" })
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("volume")
  volume(
    @Query(new ZodValidationPipe(analyticsWindowSchema)) w: AnalyticsWindow,
  ): Promise<DatePoint[]> {
    return this.analytics.volume(w);
  }

  @Get("solved")
  solved(
    @Query(new ZodValidationPipe(analyticsWindowSchema)) w: AnalyticsWindow,
  ): Promise<DatePoint[]> {
    return this.analytics.solved(w);
  }

  @Get("status")
  status(): Promise<StatusCounts> {
    return this.analytics.status();
  }

  @Get("by-department")
  byDepartment(
    @Query(new ZodValidationPipe(analyticsWindowSchema)) w: AnalyticsWindow,
  ): Promise<CountPoint[]> {
    return this.analytics.byDepartment(w);
  }

  @Get("by-technician")
  byTechnician(
    @Query(new ZodValidationPipe(analyticsWindowSchema)) w: AnalyticsWindow,
  ): Promise<CountPoint[]> {
    return this.analytics.byTechnician(w);
  }

  @Get("by-category")
  byCategory(
    @Query(new ZodValidationPipe(analyticsWindowSchema)) w: AnalyticsWindow,
  ): Promise<CountPoint[]> {
    return this.analytics.byCategory(w);
  }

  @Get("first-time-fix")
  firstTimeFix(
    @Query(new ZodValidationPipe(analyticsWindowSchema)) w: AnalyticsWindow,
  ): Promise<FirstTimeFixDto> {
    return this.analytics.firstTimeFix(w);
  }

  @Get("ongoing-ageing")
  ongoingAgeing(): Promise<OngoingAgeingItem[]> {
    return this.analytics.ongoingAgeing();
  }
}

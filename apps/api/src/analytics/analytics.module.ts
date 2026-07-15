import { Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service.js";

/**
 * M9 — Analytics. Read-only aggregates over Postgres; no writes. FR-21 buckets by
 * closed_at; first-time-fix is ongoing_at IS NULL on a Closed ticket. No Redis cache and
 * no materialized views initially. Scaffold only — see docs/implementation/M9-analytics.md.
 */
@Module({
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

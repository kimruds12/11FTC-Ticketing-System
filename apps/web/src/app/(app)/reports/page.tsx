import ReportConsole from "@/features/reports/ReportConsole";

/**
 * Generate Reports (FR-36..FR-38).
 *
 * All logic lives in the feature component — this file is a composition root only, matching
 * the dashboard. Everything on the page is live: the cross-tab comes from
 * `/analytics/report`, the period picker from `/analytics/coverage`, and the two filter
 * lists from `/departments` and `/main-issues`.
 */
export default function GenerateReportsPage() {
  return <ReportConsole />;
}

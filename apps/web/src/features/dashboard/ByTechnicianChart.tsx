import type { CountPoint } from "@11ftc/shared";

/**
 * FR-19 — tickets handled per technician, counted through `ticket_assignees` (ADR-0017).
 *
 * A ticket handled by two people credits BOTH, so the bars can legitimately sum to more than
 * the ticket count — that is stated on screen rather than left to be discovered.
 */
export default function ByTechnicianChart({
  data = [],
  emptyHint,
}: {
  data?: CountPoint[];
  emptyHint?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-xs text-gray-400 font-medium py-6 text-center">
        {emptyHint ?? "No technician activity in this period."}
      </p>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-4">
      {data.map((tech) => (
        <div key={tech.key} className="space-y-1">
          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="flex items-center gap-2 font-semibold text-gray-700">
              <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 font-bold text-[10px] flex items-center justify-center border border-teal-100">
                {initials(tech.key)}
              </span>
              {tech.key}
            </span>
            <span className="text-gray-400 font-medium">{tech.count} Tickets</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-600 transition-all duration-500"
              style={{ width: `${(tech.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-[10px] text-gray-400 font-medium pt-1 border-t border-gray-100">
        {total} assignments across {data.length}{" "}
        {data.length === 1 ? "technician" : "technicians"} — a ticket handled by two people
        counts for both.
      </p>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

import type { CountPoint } from "@11ftc/shared";

const COLORS = ["bg-blue-500", "bg-primary-700", "bg-amber-500", "bg-green-500", "bg-purple-500"];

/** FR-20 — ticket volume by main-issue category, as a share of the total. */
export default function TopIssuesChart({ data = [] }: { data?: CountPoint[] }) {
  if (data.length === 0) {
    return <p className="text-xs text-gray-400 font-medium py-6 text-center">No category data yet.</p>;
  }
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
  return (
    <div className="space-y-4">
      {data.map((issue, i) => {
        const pct = Math.round((issue.count / total) * 100);
        const color = COLORS[i % COLORS.length];
        return (
          <div key={issue.key} className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center text-xs md:text-sm">
                <span className="font-semibold text-gray-700">{issue.key}</span>
                <span className="text-gray-400 font-medium">
                  {issue.count} ({pct}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

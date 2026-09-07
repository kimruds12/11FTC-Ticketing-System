import type { CountPoint } from "@11ftc/shared";

/** FR-18 — ticket volume by department. Bars scaled to the busiest department. */
export default function ByDepartmentChart({ data = [] }: { data?: CountPoint[] }) {
  if (data.length === 0) {
    return <p className="text-xs text-gray-400 font-medium py-6 text-center">No department data yet.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-4">
      {data.map((dept) => (
        <div key={dept.key} className="space-y-1">
          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="font-semibold text-gray-700">{dept.key}</span>
            <span className="text-gray-400 font-medium">{dept.count} Tickets</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-700 transition-all duration-500"
              style={{ width: `${(dept.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

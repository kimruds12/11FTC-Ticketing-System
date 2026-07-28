/**
 * StatCard — Dashboard metric card
 *
 * Displays a single metric with an icon, value, and optional trend/badge.
 * PLV-QLib inspired: icon top-left, large value below, clean layout.
 */

interface StatCardProps {
  title: string;
  value: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: {
    label: string;
    positive?: boolean;
  };
}

export default function StatCard({
  title,
  value,
  badge,
  badgeColor = "bg-primary-50 text-primary-700",
  icon,
  iconBg,
  trend,
}: StatCardProps) {
  return (
    <div className="card p-5 flex flex-col gap-4 justify-between group hover:shadow-card-hover transition-shadow duration-200">
      {/* Top row: icon + title */}
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
              trend.positive
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-500"
            }`}
          >
            <svg
              className={`w-3 h-3 ${!trend.positive ? "transform rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {trend.label}
          </span>
        )}
      </div>

      {/* Value + Label */}
      <div>
        <p className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight tabular-nums">{value}</p>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">{title}</p>
      </div>

      {/* Optional Badge */}
      {badge && (
        <div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}

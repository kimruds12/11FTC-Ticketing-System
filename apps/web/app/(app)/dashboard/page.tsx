import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard — 11FTC IT Support" };

/* ── Stat card ────────────────────────────────────────────── */
function StatCard({
  title,
  value,
  badge,
  badgeColor,
  icon,
  iconBg,
  trend,
}: {
  title: string;
  value: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: { label: string; positive?: boolean };
}) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend.positive ? "text-green-600" : "text-red-500"}`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              {trend.positive ? (
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
              )}
            </svg>
            {trend.label}
          </span>
        )}
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Priority Queue item ──────────────────────────────────── */
function PriorityItem({
  title,
  id,
  dept,
  time,
  dotColor,
}: {
  title: string;
  id: string;
  dept: string;
  time: string;
  dotColor: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary-700 hover:underline cursor-pointer truncate">
          {title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {id} · {dept}
        </p>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
    </div>
  );
}

/* ── Resolution Trend chart (placeholder bars) ────────────── */
function ResolutionTrendChart() {
  const weeks = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const thisWeek = [45, 72, 55, 89, 63, 41, 78];
  const lastWeek = [38, 60, 48, 72, 55, 35, 65];
  const max = 100;

  return (
    <div className="flex items-end gap-2 h-40 pt-4">
      {weeks.map((day, i) => (
        <div key={day} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-end gap-0.5 h-32">
            <div
              className="w-3 bg-primary-200 rounded-t-sm transition-all duration-300"
              style={{ height: `${((lastWeek[i] ?? 0) / max) * 100}%` }}
            />
            <div
              className="w-3 bg-primary-700 rounded-t-sm transition-all duration-300"
              style={{ height: `${((thisWeek[i] ?? 0) / max) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400">{day}</span>
        </div>
      ))}
    </div>
  );
}

/* ── By Department chart (horizontal bars) ───────────────── */
function ByDepartmentChart() {
  const data = [
    { dept: "Finance", count: 34, pct: 85 },
    { dept: "Engineering", count: 28, pct: 70 },
    { dept: "Infrastructure", count: 22, pct: 55 },
    { dept: "Marketing", count: 12, pct: 30 },
    { dept: "Procurement", count: 8, pct: 20 },
  ];
  return (
    <div className="space-y-3 pt-2">
      {data.map((item) => (
        <div key={item.dept}>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{item.dept}</span>
            <span className="font-semibold">{item.count}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-700 rounded-full transition-all duration-500"
              style={{ width: `${item.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Top Issues ──────────────────────────────────────────── */
function TopIssuesChart() {
  const data = [
    { label: "Network / VPN", count: 42, color: "bg-blue-500" },
    { label: "Hardware", count: 28, color: "bg-primary-700" },
    { label: "Software / License", count: 19, color: "bg-amber-500" },
    { label: "Access / Auth", count: 15, color: "bg-green-500" },
  ];
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="pt-2 space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`} />
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{item.label}</span>
              <span className="font-semibold">{Math.round((item.count / total) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${item.color} opacity-70`}
                style={{ width: `${(item.count / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* ── Page title + CTA ────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Real-time IT metrics and ticket status.</p>
        </div>
        <Link
          href="/tickets/new"
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Ticket
        </Link>
      </div>

      {/* ── Stat cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Users"
          value="1,248"
          trend={{ label: "+5.2%", positive: true }}
          iconBg="bg-blue-50"
          icon={
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          title="Tickets Created Today"
          value="84"
          badge="HIGH VOLUME"
          badgeColor="bg-red-100 text-red-600"
          iconBg="bg-red-50"
          icon={
            <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          }
        />
        <StatCard
          title="Resolved Today"
          value="62"
          badge="AVG 2H 15M"
          badgeColor="bg-blue-100 text-blue-600"
          iconBg="bg-teal-50"
          icon={
            <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Ongoing"
          value="115"
          badge="45 CRITICAL"
          badgeColor="bg-amber-100 text-amber-700"
          iconBg="bg-amber-50"
          icon={
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* ── Charts row ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Resolution Trend */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Resolution Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">This Week vs Last Week</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-1.5 rounded-full bg-primary-700 block" />
              This week
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-1.5 rounded-full bg-primary-200 block" />
              Last week
            </div>
          </div>
          <ResolutionTrendChart />
        </div>

        {/* By Department */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">By Department</h3>
              <p className="text-xs text-gray-400 mt-0.5">Ticket Volume</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
          </div>
          <ByDepartmentChart />
        </div>
      </div>

      {/* ── Bottom row: Top Issues + Priority Queue ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Issues */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Top Issues</h3>
              <p className="text-xs text-gray-400 mt-0.5">Categorized breakdown</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
          </div>
          <TopIssuesChart />
        </div>

        {/* Priority Queue */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Priority Queue</h3>
              <p className="text-xs text-gray-400 mt-0.5">Awaiting immediate action</p>
            </div>
            <Link href="/tickets" className="text-xs text-primary-700 font-semibold hover:underline">
              View All
            </Link>
          </div>
          <div>
            <PriorityItem
              title="VPN Authentication Failure"
              id="TCK-8992"
              dept="Finance Dept"
              time="18s ago"
              dotColor="bg-red-500"
            />
            <PriorityItem
              title="Server Outage: DB-Main"
              id="TCK-8991"
              dept="Infrastructure"
              time="25s ago"
              dotColor="bg-red-500"
            />
            <PriorityItem
              title="License Renewal Warning"
              id="TCK-8985"
              dept="Procurement"
              time="1h ago"
              dotColor="bg-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

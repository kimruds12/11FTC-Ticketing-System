"use client";

import { useState, useMemo, useEffect } from "react";
import type { DatePoint, Granularity } from "@11ftc/shared";
import { browserApi } from "@/services/browser";
import { analyticsService } from "@/services/analytics.service";

interface TrendPoint {
  date: string;
  closed: number;
  ongoing: number;
}

interface ResolutionTrendChartProps {
  data?: DatePoint[];
  trendData?: TrendPoint[];
  granularity?: Granularity | "year";
  onGranularityChange?: (g: Granularity) => void;
  emptyHint?: string;
}

/**
 * Calculates smooth cubic Bezier control points for SVG path
 */
function getBezierPath(points: { x: number; y: number }[]): string {
  if (!points || points.length === 0 || !points[0]) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2 && points[1]) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1] ?? p2;

    if (!p1 || !p2 || !p0 || !p3) continue;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

export default function ResolutionTrendChart({
  data = [],
  trendData,
  granularity: externalGranularity = "month",
  onGranularityChange,
  emptyHint,
}: ResolutionTrendChartProps) {
  const [internalGranularity, setInternalGranularity] = useState<"day" | "week" | "month" | "year">("month");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // September (0-indexed 8)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [fetchedTrend, setFetchedTrend] = useState<TrendPoint[] | null>(null);

  // Self-hydrate trend data if not provided by parent
  useEffect(() => {
    let active = true;
    if (!trendData || trendData.length === 0) {
      void analyticsService(browserApi())
        .trend()
        .then((res) => {
          if (active && res) {
            setFetchedTrend(res);
          }
        })
        .catch(() => {
          // quiet fallback
        });
    }
    return () => {
      active = false;
    };
  }, [trendData]);

  const activeTrend = useMemo<TrendPoint[]>(() => {
    if (trendData && trendData.length > 0) return trendData;
    if (fetchedTrend && fetchedTrend.length > 0) return fetchedTrend;
    // Fallback convert legacy DatePoint data if needed
    return data.map((d) => ({
      date: d.date,
      closed: d.count,
      ongoing: 0,
    }));
  }, [trendData, fetchedTrend, data]);

  const activeGranularity = internalGranularity;

  const handleGranularityClick = (g: "day" | "week" | "month" | "year") => {
    setInternalGranularity(g);
    if (onGranularityChange) {
      if (g === "day" || g === "week" || g === "month") {
        onGranularityChange(g);
      } else if (g === "year") {
        onGranularityChange("month");
      }
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Prepare chart points based on active frequency and true backend dataset
  const chartPoints = useMemo(() => {
    // 1. YEARLY VIEW
    if (activeGranularity === "year") {
      // If user selected 2025 in dropdown, show years ending at 2025 with 0 tickets
      const years = selectedYear === 2025 ? [2021, 2022, 2023, 2024, 2025] : [2022, 2023, 2024, 2025, 2026];
      return years.map((y) => {
        const matchingYear = activeTrend.filter((t) => t.date.startsWith(`${y}-`));
        const closedSum = matchingYear.reduce((acc, curr) => acc + curr.closed, 0);
        const ongoingSum = matchingYear.reduce((acc, curr) => acc + curr.ongoing, 0);

        return {
          label: `${y}`,
          fullDate: `${y}`,
          done: closedSum,
          ongoing: ongoingSum,
        };
      });
    }

    // 2. MONTHLY VIEW (Jan-Dec for selectedYear)
    if (activeGranularity === "month") {
      return shortMonths.map((m, idx) => {
        const monthPrefix = `${selectedYear}-${String(idx + 1).padStart(2, "0")}`;
        const matchingMonth = activeTrend.filter((t) => t.date.startsWith(monthPrefix));
        const closedSum = matchingMonth.reduce((acc, curr) => acc + curr.closed, 0);
        const ongoingSum = matchingMonth.reduce((acc, curr) => acc + curr.ongoing, 0);

        return {
          label: m,
          fullDate: `${months[idx]} ${selectedYear}`,
          done: closedSum,
          ongoing: ongoingSum,
        };
      });
    }

    // 3. WEEKLY VIEW (4 Weeks for selectedMonth and selectedYear)
    if (activeGranularity === "week") {
      const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
      const monthRecords = activeTrend.filter((t) => t.date.startsWith(monthPrefix));

      const weekDefs = [
        { label: "W1", start: 1, end: 7 },
        { label: "W2", start: 8, end: 14 },
        { label: "W3", start: 15, end: 21 },
        { label: "W4", start: 22, end: 31 },
      ];

      return weekDefs.map((wk) => {
        const weekRecords = monthRecords.filter((t) => {
          const day = parseInt(t.date.split("-")[2] || "0", 10);
          return day >= wk.start && day <= wk.end;
        });

        const closedSum = weekRecords.reduce((acc, curr) => acc + curr.closed, 0);
        const ongoingSum = weekRecords.reduce((acc, curr) => acc + curr.ongoing, 0);

        return {
          label: `${wk.label} (${shortMonths[selectedMonth]})`,
          fullDate: `${months[selectedMonth]} ${selectedYear} - ${wk.label}`,
          done: closedSum,
          ongoing: ongoingSum,
        };
      });
    }

    // 4. DAILY VIEW (All days of the selected month that have tickets or up to current activity)
    const monthNum = String(selectedMonth + 1).padStart(2, "0");
    const monthPrefix = `${selectedYear}-${monthNum}`;
    const monthRecords = activeTrend.filter((t) => t.date.startsWith(monthPrefix));

    // Determine how many days to display for this month
    const ticketDays = monthRecords.map((t) => parseInt(t.date.split("-")[2] || "1", 10));
    const maxTicketDay = ticketDays.length > 0 ? Math.max(...ticketDays) : 0;

    // For months with tickets (like Sep 2026 with 16 days), display days 1 to maxTicketDay
    // For months with no tickets yet, display days 1 to 15 with 0 count
    const totalDaysToRender = maxTicketDay > 0 ? Math.max(16, maxTicketDay) : 15;

    const points = [];
    for (let day = 1; day <= totalDaysToRender; day++) {
      const dayStr = String(day).padStart(2, "0");
      const fullDateStr = `${monthPrefix}-${dayStr}`;
      const match = monthRecords.find((t) => t.date === fullDateStr);

      points.push({
        label: `${monthNum}/${dayStr}`,
        fullDate: `${months[selectedMonth]} ${day}, ${selectedYear}`,
        done: match ? match.closed : 0,
        ongoing: match ? match.ongoing : 0,
      });
    }
    return points;
  }, [activeTrend, activeGranularity, selectedYear, selectedMonth, months, shortMonths]);

  // Chart dimensions & scaling
  const width = 1000;
  const height = 210;
  const pL = 45;
  const pR = 35;
  const pT = 35;
  const pB = 45;
  const cw = width - pL - pR;
  const ch = height - pT - pB;

  const maxVal = Math.max(5, ...chartPoints.map((p) => Math.max(p.done, p.ongoing)));

  const coordsDone = chartPoints.map((p, i) => ({
    x: pL + (chartPoints.length <= 1 ? cw / 2 : (i / (chartPoints.length - 1)) * cw),
    y: pT + ch - (p.done / maxVal) * ch,
    val: p.done,
  }));

  const coordsOngoing = chartPoints.map((p, i) => ({
    x: pL + (chartPoints.length <= 1 ? cw / 2 : (i / (chartPoints.length - 1)) * cw),
    y: pT + ch - (p.ongoing / maxVal) * ch,
    val: p.ongoing,
  }));

  const bezierPathDone = getBezierPath(coordsDone);
  const bezierPathOngoing = getBezierPath(coordsOngoing);

  const firstPtDone = coordsDone[0];
  const lastPtDone = coordsDone[coordsDone.length - 1];

  // Grid tick values (4 steps)
  const yTicks = [
    maxVal,
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0,
  ];

  // Subtitle string matching requested view
  const subtitleStr =
    activeGranularity === "year"
      ? selectedYear === 2025
        ? "Yearly Comparison (2021 - 2025)"
        : "Yearly Comparison (2022 - 2026)"
      : activeGranularity === "month"
      ? `${selectedYear}`
      : activeGranularity === "week"
      ? `${months[selectedMonth]} ${selectedYear} (4 Weeks)`
      : `${months[selectedMonth]} ${selectedYear}`;

  return (
    <div className="w-full space-y-4 font-sans">
      {/* ── Chart Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Resolution Trend</h2>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">{subtitleStr}</p>
        </div>

        {/* Filter Controls: Pills + Date/Year selector */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="bg-slate-100/90 rounded-xl p-1 flex items-center gap-1 border border-slate-200/60 shadow-inner">
            {(["day", "week", "month", "year"] as const).map((gKey) => {
              const labels: Record<string, string> = {
                day: "Daily",
                week: "Weekly",
                month: "Monthly",
                year: "Yearly",
              };
              const isActive = activeGranularity === gKey;
              return (
                <button
                  key={gKey}
                  type="button"
                  onClick={() => handleGranularityClick(gKey)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                    isActive
                      ? "bg-[#102447] text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  }`}
                >
                  {labels[gKey]}
                </button>
              );
            })}
          </div>

          {/* Month / Year selector */}
          {activeGranularity === "month" || activeGranularity === "year" ? (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-100/90 border border-slate-200/60 text-slate-700 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer shadow-inner"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
              <option value={2022}>2022</option>
            </select>
          ) : (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-100/90 border border-slate-200/60 text-slate-700 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer shadow-inner"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Canvas / SVG Area ─────────────────────────────────── */}
      <div className="relative w-full overflow-visible pt-2 pb-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          {/* Horizontal Grid lines */}
          {yTicks.map((val, idx) => {
            const yPos = pT + (idx / (yTicks.length - 1)) * ch;
            return (
              <g key={idx}>
                <line
                  x1={pL}
                  y1={yPos}
                  x2={width - pR}
                  y2={yPos}
                  stroke={idx === yTicks.length - 1 ? "#E2E8F0" : "#F1F5F9"}
                  strokeDasharray={idx === yTicks.length - 1 ? undefined : "4 4"}
                  strokeWidth={1}
                />
                <text
                  x={pL - 12}
                  y={yPos + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-bold"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Red Area Gradient Fill under Done Spline */}
          {firstPtDone && lastPtDone && (
            <path
              d={`${bezierPathDone} L ${lastPtDone.x} ${pT + ch} L ${firstPtDone.x} ${pT + ch} Z`}
              fill="url(#doneGradient)"
              className="opacity-20"
            />
          )}

          {/* Smooth Blue Bezier Spline Curve for Ongoing */}
          <path
            d={bezierPathOngoing}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Smooth Red Bezier Spline Curve for Done */}
          <path
            d={bezierPathDone}
            fill="none"
            stroke="#E5484D"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Blue Ongoing Data Points + Labels */}
          {coordsOngoing.map((pt, i) => (
            <g key={`ongoing-${i}`}>
              {pt.val > 0 && (
                <text
                  x={pt.x}
                  y={pt.y - 8}
                  textAnchor="middle"
                  className="fill-blue-600 font-extrabold text-[11px]"
                >
                  {pt.val}
                </text>
              )}
              {pt.val > 0 && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={3.5}
                  className="fill-blue-500 stroke-white stroke-2 shadow-sm"
                />
              )}
            </g>
          ))}

          {/* Red Done Data Points + Labels */}
          {coordsDone.map((pt, i) => (
            <g key={`done-${i}`}>
              {pt.val > 0 && (
                <text
                  x={pt.x}
                  y={pt.y - 9}
                  textAnchor="middle"
                  className="fill-red-600 font-extrabold text-[11px]"
                >
                  {pt.val}
                </text>
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={3.5}
                className="fill-red-500 stroke-white stroke-2 shadow-sm"
              />

              {/* Interactive Hover Target */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={16}
                className="fill-transparent cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          ))}

          {/* X-Axis Labels (Straight horizontal letters, formatted MM/DD) */}
          {chartPoints.map((pt, i) => {
            const xPos = coordsDone[i]?.x ?? pL;
            const yPos = pT + ch + 16;
            return (
              <text
                key={i}
                x={xPos}
                y={yPos}
                textAnchor="middle"
                className="text-[10px] fill-slate-500 font-bold tracking-tight"
              >
                {pt.label}
              </text>
            );
          })}

          <defs>
            <linearGradient id="doneGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E5484D" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ongoingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>

        {/* ── Custom Dark Navy Tooltip Card ───────────────────── */}
        {hoveredIndex !== null && chartPoints[hoveredIndex] && (
          <div
            className="absolute bg-[#0f2347] text-white rounded-xl p-3 shadow-2xl border border-slate-700/60 z-30 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95 min-w-[140px]"
            style={{
              left: `${Math.min(
                82,
                Math.max(5, (hoveredIndex / Math.max(1, chartPoints.length - 1)) * 85)
              )}%`,
              top: "20px",
            }}
          >
            <p className="font-extrabold text-xs text-white pb-1.5 mb-1.5 border-b border-slate-700/80">
              {chartPoints[hoveredIndex].fullDate}
            </p>
            <div className="space-y-1 text-xs font-semibold">
              <p className="flex items-center justify-between text-slate-200">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                  Ongoing :
                </span>
                <span className="font-bold ml-2">{chartPoints[hoveredIndex].ongoing}</span>
              </p>
              <p className="flex items-center justify-between text-slate-200">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 block" />
                  Done :
                </span>
                <span className="font-bold ml-2">{chartPoints[hoveredIndex].done}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Legend ─────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-6 text-xs font-extrabold pt-2">
        <div className="flex items-center gap-2 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block shadow-sm" />
          Ongoing
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 block shadow-sm" />
          Done
        </div>
      </div>
    </div>
  );
}

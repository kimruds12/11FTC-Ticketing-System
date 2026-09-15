"use client";

import { useState } from "react";
import type { CountPoint } from "@11ftc/shared";

// 16 distinct, high-contrast vibrant colors (ensuring no two adjacent or nearby colors look similar)
const DEPT_COLORS = [
  "#D97706", // Amber / Warm Gold
  "#2563EB", // Royal Blue
  "#8B5CF6", // Purple / Violet
  "#059669", // Emerald Green
  "#4F46E5", // Deep Indigo
  "#E11D48", // Vivid Crimson / Rose
  "#0891B2", // Bright Ocean Cyan
  "#EA580C", // Vibrant Tangerine
  "#0D9488", // Dark Teal
  "#7C3AED", // Violet
  "#DB2777", // Deep Pink
  "#16A34A", // Green
  "#0284C7", // Sky Blue
  "#B45309", // Warm Bronze
  "#64748B", // Cool Slate
  "#6D28D9", // Deep Royal Purple
];

/**
 * FR-18 — Ticket Volume By Department (Horizontal Bar Graph)
 * - Maximizes available width while maintaining clean margins.
 * - Dynamic axis scale: 100 by default; steps up to 150+ when any department reaches 100 tickets.
 * - Explicit bottom axis labels (0, 25, 50, 75, 100) clearly visible.
 * - Uses "{count} tickets" instead of "count".
 * - Distinct, solid colors for every department.
 */
export default function ByDepartmentChart({
  data = [],
}: {
  data?: CountPoint[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <p className="text-xs text-slate-400 font-medium py-10 text-center">
        No department data available.
      </p>
    );
  }

  // Sort descending by ticket count
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const currentMax = Math.max(1, ...sortedData.map((d) => d.count));
  const total = sortedData.reduce((sum, d) => sum + d.count, 0);

  // Scale: 100 default; increases to 150 when tickets reach 100, then steps of 50
  const axisMax = currentMax < 100 ? 100 : currentMax < 150 ? 150 : Math.ceil(currentMax / 50) * 50;

  // 5 Vertical scale ticks (0%, 25%, 50%, 75%, 100%)
  const ticks = [
    0,
    Math.round(axisMax * 0.25),
    Math.round(axisMax * 0.5),
    Math.round(axisMax * 0.75),
    axisMax,
  ];

  return (
    <div className="w-full space-y-2 select-none font-sans px-1 sm:px-3">
      {/* Scrollable list for departments with maximized width */}
      <div className="relative pt-2 pb-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
        {/* Subtle vertical dotted gridlines spanning the chart width */}
        <div className="absolute inset-0 left-28 sm:left-36 right-16 sm:right-24 flex justify-between pointer-events-none">
          {ticks.map((_, idx) => (
            <div key={idx} className="h-full border-r border-dashed border-slate-100" />
          ))}
        </div>

        {/* Horizontal Bars List */}
        <div className="space-y-3.5 relative z-10">
          {sortedData.map((dept, idx) => {
            const barWidthPct = Math.min(100, Math.max(3, (dept.count / axisMax) * 100));
            const color = DEPT_COLORS[idx % DEPT_COLORS.length] ?? "#2563EB";
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={dept.key}
                className="flex items-center gap-3 group cursor-default"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Department Name Label */}
                <div className="w-28 sm:w-36 text-right truncate flex-shrink-0">
                  <span
                    className={`text-xs font-bold transition-colors block truncate ${
                      isHovered ? "text-slate-950 font-black" : "text-slate-700"
                    }`}
                    title={dept.key}
                  >
                    {dept.key}
                  </span>
                </div>

                {/* Horizontal Bar Container */}
                <div className="flex-1 flex items-center pr-16 sm:pr-24">
                  <div className="w-full bg-slate-50 h-5 rounded-full relative flex items-center overflow-visible">
                    {/* Colored Rounded Pill Bar */}
                    <div
                      className="h-5 rounded-full transition-all duration-500 ease-out shadow-xs flex items-center justify-end"
                      style={{
                        width: `${barWidthPct}%`,
                        backgroundColor: color,
                        opacity: isHovered ? 1 : 0.92,
                        transform: isHovered ? "scaleY(1.04)" : "scaleY(1)",
                        transformOrigin: "center",
                      }}
                    />

                    {/* Count Text directly at the end of the bar (Using 'tickets' instead of 'count') */}
                    <span className="ml-2.5 text-xs font-black text-slate-800 whitespace-nowrap drop-shadow-xs flex-shrink-0">
                      {dept.count} tickets
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explicit Bottom X-Axis Tick Scale Line (Over 100 / 150) */}
      <div className="pt-2 pb-1 border-t border-slate-100 relative">
        <div className="flex justify-between pl-28 sm:pl-36 pr-16 sm:pr-24 text-[10px] font-bold text-slate-400">
          {ticks.map((t, idx) => (
            <span key={idx} className="-translate-x-1/2">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Footer statistics footnote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 text-[11px] text-slate-400">
        <p className="font-medium">
          {total} total tickets across {sortedData.length} departments.
        </p>
        <p className="italic text-slate-400">
          Ranked by highest ticket volume (Scale: 0 – {axisMax})
        </p>
      </div>
    </div>
  );
}

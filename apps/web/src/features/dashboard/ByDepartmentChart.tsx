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
 * Styled like the horizontal reference graph (Picture 3):
 * - Department name on the left.
 * - Horizontal rounded pill bars with solid, distinct colors per department.
 * - Exact count displayed directly at the tip/end of each bar (e.g. "10 count").
 * - Subtle vertical dotted guidelines and tick scale along the bottom.
 * - Displays all departments accurately sorted by volume.
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

  // Sort descending by ticket count to match the ranking design
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const maxVal = Math.max(1, ...sortedData.map((d) => d.count));
  const total = sortedData.reduce((sum, d) => sum + d.count, 0);

  // 5 Vertical scale ticks (0%, 25%, 50%, 75%, 100%)
  const ticks = [
    0,
    Math.round(maxVal * 0.25),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.75),
    maxVal,
  ];

  return (
    <div className="w-full space-y-4 select-none font-sans">
      {/* Scrollable container for departments if list is long */}
      <div className="relative pt-2 pb-6 max-h-[520px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
        {/* Subtle vertical dotted gridlines */}
        <div className="absolute inset-0 left-36 sm:left-48 right-20 flex justify-between pointer-events-none">
          {ticks.map((t, idx) => (
            <div key={idx} className="h-full border-r border-dashed border-slate-100 relative">
              <span className="absolute -bottom-5 -translate-x-1/2 text-[10px] font-bold text-slate-300">
                {t}
              </span>
            </div>
          ))}
        </div>

        {/* Horizontal Bars List */}
        <div className="space-y-3.5 relative z-10">
          {sortedData.map((dept, idx) => {
            const barWidthPct = Math.max(4, (dept.count / maxVal) * 100);
            const color = DEPT_COLORS[idx % DEPT_COLORS.length] ?? "#2563EB";
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={dept.key}
                className="flex items-center gap-3 group cursor-default"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Department Name Label on Left */}
                <div className="w-36 sm:w-48 text-right truncate flex-shrink-0">
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
                <div className="flex-1 flex items-center pr-2">
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

                    {/* Count Text directly at the end/tip of the bar */}
                    <span className="ml-2.5 text-xs font-black text-slate-800 whitespace-nowrap drop-shadow-xs flex-shrink-0">
                      {dept.count} count
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer statistics footnote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
        <p className="font-medium">
          {total} total tickets across {sortedData.length} departments.
        </p>
        <p className="italic text-slate-400">
          Ranked by highest ticket volume
        </p>
      </div>
    </div>
  );
}

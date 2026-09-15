"use client";

import { useState } from "react";
import type { CountPoint } from "@11ftc/shared";

// 7 distinct, high-contrast vibrant colors (matching picture 2 and distinct from each other)
const TECH_COLORS = [
  "#F59E0B", // Amber / Warm Gold
  "#3B82F6", // Bright Blue
  "#8B5CF6", // Purple / Violet
  "#10B981", // Emerald Green
  "#6366F1", // Indigo / Royal Blue
  "#F43F5E", // Rose / Crimson
  "#06B6D4", // Bright Cyan
];

/**
 * FR-19 — tickets handled per technician, styled like reference picture 2:
 * Horizontal rounded bars with individual solid colors, dotted background guidelines,
 * and count labels displayed directly at the tip of the bars.
 */
export default function ByTechnicianChart({
  data = [],
  emptyHint,
}: {
  data?: CountPoint[];
  emptyHint?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <p className="text-xs text-slate-400 font-medium py-10 text-center">
        {emptyHint ?? "No technician activity in this period."}
      </p>
    );
  }

  // Sort descending by ticket count
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const maxVal = Math.max(1, ...sortedData.map((d) => d.count));
  const total = sortedData.reduce((sum, d) => sum + d.count, 0);

  // 5 Background dotted tick marks (0%, 25%, 50%, 75%, 100%)
  const ticks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  return (
    <div className="w-full space-y-4 select-none font-sans">
      {/* Background relative chart area */}
      <div className="relative pt-2 pb-1">
        {/* Subtle vertical dotted gridlines */}
        <div className="absolute inset-0 left-28 sm:left-36 right-16 flex justify-between pointer-events-none">
          {ticks.map((t, idx) => (
            <div key={idx} className="h-full border-r border-dashed border-slate-100 relative">
              <span className="absolute -bottom-5 -translate-x-1/2 text-[10px] font-bold text-slate-300">
                {t}
              </span>
            </div>
          ))}
        </div>

        {/* Horizontal Bars List */}
        <div className="space-y-4 relative z-10">
          {sortedData.map((tech, idx) => {
            const barWidthPct = Math.max(4, (tech.count / maxVal) * 100);
            const color = TECH_COLORS[idx % TECH_COLORS.length] ?? "#3B82F6";
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={tech.key}
                className="flex items-center gap-3 group cursor-default"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Technician Name Label on Left */}
                <div className="w-28 sm:w-36 text-right truncate flex-shrink-0">
                  <span
                    className={`text-xs font-bold transition-colors ${
                      isHovered ? "text-slate-900 font-extrabold" : "text-slate-700"
                    }`}
                    title={tech.key}
                  >
                    {tech.key}
                  </span>
                </div>

                {/* Horizontal Bar Container */}
                <div className="flex-1 flex items-center pr-2">
                  <div className="w-full bg-slate-50 h-5 rounded-full relative flex items-center overflow-visible">
                    {/* Colored Rounded Bar */}
                    <div
                      className="h-5 rounded-full transition-all duration-500 ease-out shadow-sm flex items-center justify-end"
                      style={{
                        width: `${barWidthPct}%`,
                        backgroundColor: color,
                        opacity: isHovered ? 1 : 0.9,
                      }}
                    />

                    {/* Count Text directly at the end of the bar */}
                    <span
                      className="ml-2.5 text-xs font-black text-slate-800 whitespace-nowrap drop-shadow-sm flex-shrink-0"
                    >
                      {tech.count} tickets
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer assignment footnote */}
      <p className="text-[10px] text-slate-400 font-medium pt-5 border-t border-slate-100">
        {total} total assignments across {sortedData.length}{" "}
        {sortedData.length === 1 ? "technician" : "technicians"} (a ticket handled by two technicians counts for both).
      </p>
    </div>
  );
}


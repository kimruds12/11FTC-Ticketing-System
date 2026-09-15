"use client";

import { useState } from "react";
import type { CountPoint } from "@11ftc/shared";

// 10 distinct, high-contrast vibrant colors (Deep Navy #1E3A8A and Amber #D97706 first)
const TECH_COLORS = [
  "#1E3A8A", // Deep Navy (Kim)
  "#D97706", // Amber / Warm Gold (Patrick)
  "#2563EB", // Royal Blue (Paul)
  "#8B5CF6", // Purple / Violet (Philip)
  "#059669", // Emerald Green (IT Team)
  "#E11D48", // Vivid Crimson / Rose
  "#0891B2", // Bright Ocean Cyan
  "#EA580C", // Vivid Tangerine
  "#4F46E5", // Deep Indigo
  "#14B8A6", // Bright Teal
];

/**
 * FR-19 — By Technician (Vertical Box Bar Graph)
 * - Fixed Y-Axis max at 300 (steps: 300, 225, 150, 75, 0).
 * - Kim (233) accurately hits 77.6% of the 300 height, leaving ample clearance for count labels.
 * - Flat box bars with NO curves (rounded-none).
 * - Moved downwards slightly with top padding to maximize vertical space.
 * - Symmetrically centered: Kim, Patrick, Paul, Philip & IT are all 100% visible with no edge clipping.
 * - Horizontally scrollable if more interns join in the future.
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
      <p className="text-xs text-slate-400 font-medium py-14 text-center">
        {emptyHint ?? "No technician activity in this period."}
      </p>
    );
  }

  // Sort descending by ticket count
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const total = sortedData.reduce((sum, d) => sum + d.count, 0);

  // Highest on graph set to 300 as instructed, with 4 equal intervals of 75
  const maxVal = Math.max(300, ...sortedData.map((d) => d.count));
  const yTicks = [300, 225, 150, 75, 0];

  // If 5 or fewer technicians, evenly space them across the full width so Kim & all techs are never clipped
  const isScrollable = sortedData.length > 5;

  return (
    <div className="w-full flex flex-col justify-between select-none font-sans space-y-3 pt-3">
      {/* Main Chart Section: Moved downwards with pt-4 / pt-6 */}
      <div className="relative flex items-stretch pt-6 pb-2">
        {/* Left Fixed Y-Axis Labels */}
        <div className="flex flex-col justify-between items-end pr-3 select-none flex-shrink-0 h-64 sm:h-72 pb-6">
          {yTicks.map((val, idx) => (
            <span key={idx} className="text-[11px] font-bold text-slate-400 leading-none">
              {val}
            </span>
          ))}
        </div>

        {/* Bar Graph Viewport */}
        <div
          className={`relative flex-1 ${
            isScrollable
              ? "overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
              : "overflow-visible"
          }`}
        >
          {/* Horizontal Background Dashed Guidelines */}
          <div className="absolute inset-0 right-0 left-0 flex flex-col justify-between pointer-events-none h-64 sm:h-72 pb-6">
            {yTicks.map((_, idx) => (
              <div
                key={idx}
                className="w-full border-b border-dashed border-slate-100"
              />
            ))}
          </div>

          {/* Vertical Box Bars */}
          <div
            className={`relative z-10 flex items-end h-64 sm:h-72 pb-6 ${
              isScrollable
                ? "justify-start gap-6 px-4 min-w-max"
                : "justify-around sm:justify-evenly w-full px-2"
            }`}
          >
            {sortedData.map((tech, idx) => {
              // Exact mathematical scale against maxVal (300)
              const barHeightPct = Math.min(100, Math.max(4, (tech.count / maxVal) * 100));
              const color = TECH_COLORS[idx % TECH_COLORS.length] ?? "#1E3A8A";
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={tech.key}
                  className="flex flex-col items-center justify-end h-full min-w-[54px] sm:min-w-[66px] group cursor-default relative"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Count Text Above Bar (e.g. "233 count") */}
                  <span
                    className={`text-xs font-black text-slate-800 transition-all duration-200 mb-1.5 whitespace-nowrap drop-shadow-xs ${
                      isHovered ? "scale-110 text-slate-950 font-black" : ""
                    }`}
                  >
                    {tech.count} count
                  </span>

                  {/* Vertical Flat Box Bar (No end curve / rounded-none) */}
                  <div className="w-12 sm:w-14 flex items-end justify-center h-full">
                    <div
                      className="w-full rounded-none transition-all duration-500 ease-out shadow-xs"
                      style={{
                        height: `${barHeightPct}%`,
                        backgroundColor: color,
                        opacity: isHovered ? 1 : 0.92,
                        transform: isHovered ? "scaleY(1.02)" : "scaleY(1)",
                        transformOrigin: "bottom",
                      }}
                    />
                  </div>

                  {/* Technician Name Underneath */}
                  <div className="absolute -bottom-6 w-full text-center">
                    <span
                      className={`text-xs font-bold transition-colors block truncate px-0.5 ${
                        isHovered ? "text-slate-950 font-black" : "text-slate-700"
                      }`}
                      title={tech.key}
                    >
                      {tech.key}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Hint & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
        <p className="font-medium">
          {total} total assignments across {sortedData.length}{" "}
          {sortedData.length === 1 ? "technician" : "technicians"}.
        </p>
        {isScrollable && (
          <p className="italic text-slate-400 text-right">
            Scroll sideways ↔ for all technicians / interns
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { CountPoint } from "@11ftc/shared";

// 10 distinct, high-contrast vibrant colors (Deep Navy #1E3A8A and Amber #D97706 first)
const TECH_COLORS = [
  "#1E3A8A", // Deep Navy
  "#D97706", // Amber / Warm Gold
  "#2563EB", // Royal Blue
  "#8B5CF6", // Purple / Violet
  "#059669", // Emerald Green
  "#E11D48", // Vivid Crimson / Rose
  "#0891B2", // Bright Ocean Cyan
  "#EA580C", // Vivid Tangerine
  "#4F46E5", // Deep Indigo
  "#14B8A6", // Bright Teal
];

/**
 * FR-19 — By Technician (Vertical Box Bar Graph)
 * - Flat box bars with NO curve (rounded-none).
 * - Perfectly centered across the container.
 * - Increased height (h-80 / 320px) to balance symmetrically with Main Issue Categories.
 * - Count label directly above each box (e.g. "233 count").
 * - Horizontal scrolling for additional future IT interns.
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
  const maxVal = Math.max(1, ...sortedData.map((d) => d.count));
  const total = sortedData.reduce((sum, d) => sum + d.count, 0);

  // 5 horizontal grid steps (0, 25%, 50%, 75%, 100%)
  const yTicks = [
    maxVal,
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0,
  ];

  return (
    <div className="w-full flex flex-col justify-between select-none font-sans space-y-4 pt-1">
      {/* Main Chart Section: Fixed Left Y-Axis + Centered Horizontally Scrollable Bar Viewport */}
      <div className="relative flex items-stretch pt-2">
        {/* Left Fixed Y-Axis Labels */}
        <div className="flex flex-col justify-between items-end pr-3 select-none flex-shrink-0 h-72 sm:h-80 pb-7">
          {yTicks.map((val, idx) => (
            <span key={idx} className="text-[11px] font-bold text-slate-400 leading-none">
              {val}
            </span>
          ))}
        </div>

        {/* Scrollable / Centered Bar Graph Viewport */}
        <div className="relative flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {/* Horizontal Background Dashed Guidelines */}
          <div className="absolute inset-0 right-0 left-0 flex flex-col justify-between pointer-events-none h-72 sm:h-80 pb-7">
            {yTicks.map((_, idx) => (
              <div
                key={idx}
                className="w-full border-b border-dashed border-slate-100"
              />
            ))}
          </div>

          {/* Vertical Box Bars (Centered when few, scrollable when many) */}
          <div className="relative z-10 flex items-end justify-center min-w-full gap-8 sm:gap-12 px-4 h-72 sm:h-80 pb-7">
            {sortedData.map((tech, idx) => {
              // Scale up to 88% of vertical space so count label has ample clearance at the top
              const barHeightPct = Math.max(6, (tech.count / maxVal) * 88);
              const color = TECH_COLORS[idx % TECH_COLORS.length] ?? "#1E3A8A";
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={tech.key}
                  className="flex flex-col items-center justify-end h-full min-w-[68px] sm:min-w-[80px] group cursor-default relative"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Count Text Above Bar (e.g. "233 count") */}
                  <span
                    className={`text-xs font-black text-slate-800 transition-all duration-200 mb-2 whitespace-nowrap drop-shadow-xs ${
                      isHovered ? "scale-110 text-slate-950 font-black" : ""
                    }`}
                  >
                    {tech.count} count
                  </span>

                  {/* Vertical Flat Box Bar (No end curve / rounded-none) */}
                  <div className="w-14 sm:w-16 flex items-end justify-center h-full">
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
        {sortedData.length > 5 && (
          <p className="italic text-slate-400 text-right">
            Scroll sideways ↔ for all technicians / interns
          </p>
        )}
      </div>
    </div>
  );
}

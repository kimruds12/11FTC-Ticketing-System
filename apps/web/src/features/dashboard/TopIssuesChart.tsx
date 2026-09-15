"use client";

import { useState } from "react";
import type { CountPoint } from "@11ftc/shared";

// 7 distinctly different, high-contrast colors (no two colors similar)
const SLICE_COLORS = [
  "#E11D48", // Vivid Crimson Rose
  "#2563EB", // Bright Cobalt Blue
  "#D97706", // Warm Golden Amber
  "#059669", // Rich Emerald Green
  "#7C3AED", // Deep Royal Violet
  "#0891B2", // Deep Ocean Cyan
  "#EA580C", // Vibrant Tangerine
];

/**
 * Helper to compute SVG Arc path for donut chart
 */
function getDonutSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
): string {
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x1Outer = cx + rOuter * Math.cos(rad(startAngle));
  const y1Outer = cy + rOuter * Math.sin(rad(startAngle));
  const x2Outer = cx + rOuter * Math.cos(rad(endAngle));
  const y2Outer = cy + rOuter * Math.sin(rad(endAngle));

  const x1Inner = cx + rInner * Math.cos(rad(endAngle));
  const y1Inner = cy + rInner * Math.sin(rad(endAngle));
  const x2Inner = cx + rInner * Math.cos(rad(startAngle));
  const y2Inner = cy + rInner * Math.sin(rad(startAngle));

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${x1Outer} ${y1Outer}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
    `L ${x1Inner} ${y1Inner}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
    "Z",
  ].join(" ");
}

/**
 * FR-20 — Main Issue Categories Donut Chart with enlarged ring for prominent visibility
 */
export default function TopIssuesChart({ data = [] }: { data?: CountPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-xs text-slate-400 font-medium py-10 text-center">No category data yet.</p>;
  }

  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;

  // Calculate angles for slices (viewBox 240x240, center 120,120)
  let currentAngle = 0;
  const slices = data.map((item, idx) => {
    const pct = Math.round((item.count / total) * 100);
    const angleSpan = (item.count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSpan - 1.2; // clean separation gap
    currentAngle += angleSpan;

    const midAngle = startAngle + angleSpan / 2;
    const midRad = ((midAngle - 90) * Math.PI) / 180;
    // Midpoint radius for centered percentage label
    const labelR = 80;
    const labelX = 120 + labelR * Math.cos(midRad);
    const labelY = 120 + labelR * Math.sin(midRad);

    return {
      ...item,
      pct,
      color: SLICE_COLORS[idx % SLICE_COLORS.length],
      startAngle,
      endAngle,
      labelX,
      labelY,
    };
  });

  // Divide legend into 2 columns (left column, right column)
  const midIdx = Math.ceil(slices.length / 2);
  const leftSlices = slices.slice(0, midIdx);
  const rightSlices = slices.slice(midIdx);

  return (
    <div className="w-full space-y-5 select-none font-sans">
      {/* Header with total badge */}
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
          ({total} total tickets)
        </span>
      </div>

      {/* Enlarged SVG Donut Chart */}
      <div className="relative flex justify-center items-center py-1">
        <svg viewBox="0 0 240 240" className="w-64 h-64 sm:w-72 sm:h-72 overflow-visible">
          {slices.map((slice, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={slice.key} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                <path
                  d={getDonutSlicePath(120, 120, isHovered ? 108 : 104, 56, slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                  className="transition-all duration-200 cursor-pointer hover:opacity-95"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
                {/* Clearly visible percentage text inside slice */}
                {slice.pct >= 4 && (
                  <text
                    x={slice.labelX}
                    y={slice.labelY + 4}
                    textAnchor="middle"
                    className="fill-white font-black text-[11px] sm:text-xs pointer-events-none drop-shadow-md select-none"
                  >
                    {slice.pct}%
                  </text>
                )}
              </g>
            );
          })}

          {/* Center hole text in donut */}
          <circle cx={120} cy={120} r={52} className="fill-white drop-shadow-sm" />
          <text x={120} y={116} textAnchor="middle" className="fill-slate-900 font-black text-xl">
            {hoveredIdx !== null && slices[hoveredIdx] ? slices[hoveredIdx].count : total}
          </text>
          <text x={120} y={133} textAnchor="middle" className="fill-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
            {hoveredIdx !== null && slices[hoveredIdx] ? slices[hoveredIdx].key.slice(0, 11) : "Tickets"}
          </text>
        </svg>
      </div>

      {/* 2-Column Legend matching Reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-3 border-t border-slate-100 text-xs">
        <div className="space-y-2">
          {leftSlices.map((s) => (
            <div key={s.key} className="flex items-center justify-between group cursor-default">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: s.color }} />
                <span className="font-bold text-slate-700 truncate group-hover:text-slate-900">{s.key}</span>
              </div>
              <span className="font-black text-slate-900 ml-2">{s.count}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {rightSlices.map((s) => (
            <div key={s.key} className="flex items-center justify-between group cursor-default">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: s.color }} />
                <span className="font-bold text-slate-700 truncate group-hover:text-slate-900">{s.key}</span>
              </div>
              <span className="font-black text-slate-900 ml-2">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



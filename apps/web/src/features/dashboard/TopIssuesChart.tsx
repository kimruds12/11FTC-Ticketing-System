"use client";

import { useState } from "react";
import type { CountPoint } from "@11ftc/shared";

const SLICE_COLORS = [
  "#2563EB", // Primary Blue
  "#1D4ED8", // Darker Blue
  "#059669", // Emerald Green
  "#10B981", // Light Green
  "#D97706", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
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
 * FR-20 — Main Issue Categories Donut Chart matching reference picture 2
 */
export default function TopIssuesChart({ data = [] }: { data?: CountPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-xs text-slate-400 font-medium py-10 text-center">No category data yet.</p>;
  }

  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;

  // Calculate angles for slices
  let currentAngle = 0;
  const slices = data.map((item, idx) => {
    const pct = Math.round((item.count / total) * 100);
    const angleSpan = (item.count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSpan - 1.5; // slight gap
    currentAngle += angleSpan;

    const midAngle = startAngle + angleSpan / 2;
    const midRad = ((midAngle - 90) * Math.PI) / 180;
    const labelR = 66; // midpoint between inner (50) and outer (82)
    const labelX = 100 + labelR * Math.cos(midRad);
    const labelY = 100 + labelR * Math.sin(midRad);

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

  // Divide legend into 2 columns (left column, right column) like picture 2
  const midIdx = Math.ceil(slices.length / 2);
  const leftSlices = slices.slice(0, midIdx);
  const rightSlices = slices.slice(midIdx);

  return (
    <div className="w-full space-y-6 select-none font-sans">
      {/* Header with total badge */}
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          ({total} total tickets)
        </span>
      </div>

      {/* SVG Donut Chart */}
      <div className="relative flex justify-center items-center py-2">
        <svg viewBox="0 0 200 200" className="w-56 h-56 overflow-visible">
          {slices.map((slice, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={slice.key} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                <path
                  d={getDonutSlicePath(100, 100, isHovered ? 86 : 82, 50, slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                  className="transition-all duration-200 cursor-pointer shadow-sm"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                {/* Percentage text inside slice if > 4% */}
                {slice.pct >= 5 && (
                  <text
                    x={slice.labelX}
                    y={slice.labelY + 4}
                    textAnchor="middle"
                    className="fill-white font-extrabold text-[10px] pointer-events-none drop-shadow-sm"
                  >
                    {slice.pct}%
                  </text>
                )}
              </g>
            );
          })}

          {/* Center text in donut */}
          <circle cx={100} cy={100} r={46} className="fill-white" />
          <text x={100} y={96} textAnchor="middle" className="fill-slate-900 font-extrabold text-lg">
            {hoveredIdx !== null && slices[hoveredIdx] ? slices[hoveredIdx].count : total}
          </text>
          <text x={100} y={112} textAnchor="middle" className="fill-slate-400 font-bold text-[10px] uppercase tracking-wider">
            {hoveredIdx !== null && slices[hoveredIdx] ? slices[hoveredIdx].key.slice(0, 10) : "Tickets"}
          </text>
        </svg>
      </div>

      {/* 2-Column Legend matching Picture 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t border-slate-100 text-xs">
        <div className="space-y-2.5">
          {leftSlices.map((s) => (
            <div key={s.key} className="flex items-center justify-between group cursor-default">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="font-bold text-slate-700 truncate group-hover:text-slate-900">{s.key}</span>
              </div>
              <span className="font-extrabold text-slate-900 ml-2">{s.count}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          {rightSlices.map((s) => (
            <div key={s.key} className="flex items-center justify-between group cursor-default">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="font-bold text-slate-700 truncate group-hover:text-slate-900">{s.key}</span>
              </div>
              <span className="font-extrabold text-slate-900 ml-2">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


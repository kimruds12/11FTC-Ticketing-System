"use client";

import { useState } from "react";
import type { CountPoint } from "@11ftc/shared";

/**
 * FR-18 — Ticket Volume By Department (Vertical Bar Graph)
 * Displays all departments in a spacious, horizontally scrollable frame with vertical red bars.
 */
export default function ByDepartmentChart({ data = [] }: { data?: CountPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-xs text-slate-400 font-medium py-10 text-center">No department data available.</p>;
  }

  const maxVal = Math.max(1, ...data.map((d) => d.count));

  // Dynamic canvas width based on number of departments (minimum 1100px for breathing room)
  const canvasWidth = Math.max(1100, data.length * 45);
  const height = 280;
  const pL = 80; // Extra left padding to ensure space gap for Y-axis numbers
  const pR = 40;
  const pT = 35; // extra top margin for count labels above max bar
  const pB = 100; // bottom padding for rotated department names
  const cw = canvasWidth - pL - pR;
  const ch = height - pT - pB;

  const barWidth = Math.max(14, Math.min(26, (cw / data.length) * 0.6));

  // Horizontal Grid tick steps (4 steps)
  const yTicks = [
    maxVal,
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0
  ];

  return (
    <div className="w-full space-y-2 font-sans select-none">
      {/* Scrollable Container with horizontal drag / scroll */}
      <div className="relative w-full overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
        <svg
          viewBox={`0 0 ${canvasWidth} ${height}`}
          style={{ minWidth: `${canvasWidth}px` }}
          className="w-full h-auto overflow-visible"
        >
          {/* Horizontal Background Grid Lines */}
          {yTicks.map((val, idx) => {
            const yPos = pT + (idx / (yTicks.length - 1)) * ch;
            return (
              <g key={idx}>
                <line
                  x1={pL}
                  y1={yPos}
                  x2={canvasWidth - pR}
                  y2={yPos}
                  stroke={idx === yTicks.length - 1 ? "#CBD5E1" : "#F1F5F9"}
                  strokeDasharray={idx === yTicks.length - 1 ? undefined : "4 4"}
                  strokeWidth={1}
                />
                {/* Y-Axis text with 25px explicit space gap from bars */}
                <text
                  x={pL - 25}
                  y={yPos + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-extrabold"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Vertical Bars & Count Labels */}
          {data.map((dept, i) => {
            const xPos = pL + (i / Math.max(1, data.length - 1)) * cw;
            const barHeight = Math.max(4, (dept.count / maxVal) * ch);
            const yPos = pT + ch - barHeight;
            const isHovered = hoveredIdx === i;

            return (
              <g key={dept.key} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                {/* Count number displayed above each vertical bar with space gap */}
                {dept.count > 0 && (
                  <text
                    x={xPos}
                    y={yPos - 8}
                    textAnchor="middle"
                    className={`font-extrabold text-[10px] transition-colors ${
                      isHovered ? "fill-red-600 font-black text-xs" : "fill-slate-700"
                    }`}
                  >
                    {dept.count}
                  </text>
                )}

                {/* Vertical Bar Rect with Red Gradient */}
                <rect
                  x={xPos - barWidth / 2}
                  y={yPos}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={isHovered ? "#DC2626" : "url(#deptRedBarGradient)"}
                  className="transition-all duration-200 cursor-pointer hover:opacity-90 shadow-sm"
                />

                {/* Invisible hover area */}
                <rect
                  x={xPos - barWidth * 0.9}
                  y={pT}
                  width={barWidth * 1.8}
                  height={ch + pB}
                  fill="transparent"
                  className="cursor-pointer"
                />

                {/* Department Label rotated -45 deg with 22px baseline gap */}
                <text
                  x={xPos}
                  y={pT + ch + 22}
                  textAnchor="end"
                  transform={`rotate(-45, ${xPos}, ${pT + ch + 22})`}
                  className={`text-[10px] font-bold tracking-tight transition-colors ${
                    isHovered ? "fill-red-600 font-extrabold" : "fill-slate-600"
                  }`}
                >
                  {dept.key}
                </text>
              </g>
            );
          })}

          <defs>
            <linearGradient id="deptRedBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
          </defs>
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="absolute bg-slate-900 text-white rounded-lg px-3 py-1.5 shadow-xl text-xs z-20 border border-slate-800 pointer-events-none transition-all"
            style={{
              left: `${Math.min(
                85,
                Math.max(5, (hoveredIdx / Math.max(1, data.length - 1)) * 90)
              )}%`,
              top: "10px",
            }}
          >
            <p className="font-bold text-[11px] text-red-300">{data[hoveredIdx].key}</p>
            <p className="font-extrabold text-white text-xs mt-0.5">
              {data[hoveredIdx].count} Tickets
            </p>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400 font-medium text-right pr-2 italic">
        Scroll sideways ↔ to view all departments
      </p>
    </div>
  );
}


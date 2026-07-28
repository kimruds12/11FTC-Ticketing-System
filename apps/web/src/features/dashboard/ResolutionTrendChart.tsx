"use client";

import { useState } from "react";

/**
 * Visitor Traffic / Resolution Trend Chart
 *
 * Rendered as an SVG line chart matching the second picture:
 * - Line stays at 0 across the month.
 * - Spikes to 1 on a single day (07/13/2026).
 * - Legend with Check-In (blue) and Check-Out (red).
 */
export default function ResolutionTrendChart() {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const dates = [
    "07/01/2026", "07/02/2026", "07/03/2026", "07/04/2026", "07/05/2026",
    "07/06/2026", "07/07/2026", "07/08/2026", "07/09/2026", "07/10/2026",
    "07/11/2026", "07/12/2026", "07/13/2026", "07/14/2026", "07/15/2026",
    "07/16/2026", "07/17/2026", "07/18/2026", "07/19/2026"
  ];

  // The heights of the chart points (0 to 1 scale)
  const dataPoints = dates.map(date => (date === "07/13/2026" ? 1.0 : 0.0));

  // Width of the SVG canvas is 800, height is 160
  const width = 800;
  const height = 140;
  const paddingLeft = 30;
  const paddingRight = 30;
  const paddingTop = 20;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getCoordinates = () => {
    return dataPoints.map((val, index) => {
      const x = paddingLeft + (index / (dataPoints.length - 1)) * chartWidth;
      // In SVG, y is 0 at the top, so we subtract height
      const y = paddingTop + chartHeight - val * chartHeight;
      return { x, y };
    });
  };

  const coordinates = getCoordinates();
  const pathData = coordinates.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ""
  );

  return (
    <div className="w-full space-y-4">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Resolution Trends Tickets</h3>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">July 2026</p>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-0.5 text-[10px] font-bold">
          <button className="px-2.5 py-1 rounded bg-white text-gray-900 shadow-sm">Daily</button>
          <button className="px-2.5 py-1 rounded text-gray-400 hover:text-gray-600">Weekly</button>
          <button className="px-2.5 py-1 rounded text-gray-400 hover:text-gray-600">Monthly</button>
          <button className="px-2.5 py-1 rounded text-gray-400 hover:text-gray-600">Yearly</button>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div className="relative border-b border-gray-100 pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Y Axis Grid Lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#F3F4F6" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="#F3F4F6" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="#E5E7EB" />

          {/* Y Axis Labels */}
          <text x={10} y={paddingTop + 4} className="text-[9px] fill-gray-400 font-bold">1</text>
          <text x={10} y={paddingTop + chartHeight / 2 + 4} className="text-[9px] fill-gray-400 font-bold">0.5</text>
          <text x={10} y={paddingTop + chartHeight + 4} className="text-[9px] fill-gray-400 font-bold">0</text>

          {/* Spark area fill */}
          {coordinates.length > 0 && (
            <path
              d={`${pathData} L ${coordinates[coordinates.length - 1]?.x ?? 0} ${paddingTop + chartHeight} L ${coordinates[0]?.x ?? 0} ${paddingTop + chartHeight} Z`}
              fill="url(#sparkGradient)"
              className="opacity-10"
            />
          )}

          {/* Main Line path */}
          <path
            d={pathData}
            fill="none"
            stroke="#EF4444"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive dots & hover circles */}
          {coordinates.map((pt, i) => {
            const isSpike = dates[i] === "07/13/2026";
            return (
              <g key={i}>
                {isSpike && (
                  <circle cx={pt.x} cy={pt.y} r={4} className="fill-red-600 stroke-white stroke-2" />
                )}
                {/* Invisible hover trigger area */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={8}
                  className="fill-transparent cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
          </defs>
        </svg>

        {/* X Axis dates */}
        <div className="flex justify-between text-[8px] font-bold text-gray-400 uppercase tracking-wider px-6 mt-2 select-none">
          {dates.map((date, idx) => {
            // Display only some labels to prevent overcrowding
            const showLabel = idx % 2 === 0 || idx === dates.length - 1;
            return (
              <span
                key={date}
                className="w-8 text-center transition-opacity"
                style={{ visibility: showLabel ? "visible" : "hidden" }}
              >
                {date}
              </span>
            );
          })}
        </div>

        {/* Custom Tooltip overlay matching second picture */}
        {hoveredPoint !== null && dates[hoveredPoint] === "07/13/2026" && (
          <div
            className="absolute bg-slate-900 text-white rounded-lg p-2.5 shadow-xl text-xs z-20 border border-slate-800 animate-fade-in pointer-events-none"
            style={{
              left: `${(hoveredPoint / (dataPoints.length - 1)) * 90}%`,
              top: "10px",
            }}
          >
            <p className="font-bold text-[10px] text-gray-400">07/13/2026</p>
            <p className="font-semibold mt-1 text-red-400">Resolved Tickets: 1</p>
          </div>
        )}
      </div>

      {/* Legend below chart */}
      <div className="flex items-center justify-center gap-4 text-xs font-semibold mt-2">
        <div className="flex items-center gap-1.5 text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
          Resolved Tickets
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { DatePoint, Granularity } from "@11ftc/shared";
import { bucketLabel } from "./period";

/**
 * FR-21 — resolution trend: problems solved per bucket (always bucketed by `closed_at`, never
 * by encode date). SVG line scaled to the busiest bucket in the window.
 */
export default function ResolutionTrendChart({
  data = [],
  granularity = "day",
  emptyHint,
}: {
  data?: DatePoint[];
  granularity?: Granularity;
  emptyHint?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const perBucket =
    granularity === "month" ? "per month" : granularity === "week" ? "per week" : "per day";

  if (data.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-sm font-bold text-gray-900">Resolution Trend</h3>
        {/* Says WHICH window is empty — otherwise a quiet week is indistinguishable from a
            broken dashboard, which is exactly how this looked before. */}
        <p className="text-xs text-gray-400 font-medium py-10 text-center">
          {emptyHint ?? "No resolved tickets in this period."}
        </p>
      </div>
    );
  }

  const width = 800;
  const height = 140;
  const pL = 34;
  const pR = 30;
  const pT = 20;
  const pB = 20;
  const cw = width - pL - pR;
  const ch = height - pT - pB;
  const max = Math.max(1, ...data.map((p) => p.count));

  const coords = data.map((p, i) => ({
    x: pL + (data.length === 1 ? cw / 2 : (i / (data.length - 1)) * cw),
    y: pT + ch - (p.count / max) * ch,
  }));
  const path = coords.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    "",
  );
  const first = coords[0];
  const last = coords[coords.length - 1];

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Resolution Trend</h3>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
            Problems solved {perBucket}
          </p>
        </div>
      </div>

      <div className="relative border-b border-gray-100 pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <line x1={pL} y1={pT} x2={width - pR} y2={pT} stroke="#F3F4F6" strokeDasharray="3 3" />
          <line x1={pL} y1={pT + ch / 2} x2={width - pR} y2={pT + ch / 2} stroke="#F3F4F6" strokeDasharray="3 3" />
          <line x1={pL} y1={pT + ch} x2={width - pR} y2={pT + ch} stroke="#E5E7EB" />

          <text x={10} y={pT + 4} className="text-[9px] fill-gray-400 font-bold">{max}</text>
          <text x={10} y={pT + ch / 2 + 4} className="text-[9px] fill-gray-400 font-bold">{Math.round(max / 2)}</text>
          <text x={10} y={pT + ch + 4} className="text-[9px] fill-gray-400 font-bold">0</text>

          {first && last && (
            <path
              d={`${path} L ${last.x} ${pT + ch} L ${first.x} ${pT + ch} Z`}
              fill="url(#sparkGradient)"
              className="opacity-10"
            />
          )}
          <path d={path} fill="none" stroke="#EF4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {coords.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={3} className="fill-red-600 stroke-white stroke-2" />
              <circle
                cx={pt.x}
                cy={pt.y}
                r={9}
                className="fill-transparent cursor-pointer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          ))}

          <defs>
            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
          </defs>
        </svg>

        {hovered !== null && data[hovered] && (
          <div
            className="absolute bg-slate-900 text-white rounded-lg p-2.5 shadow-xl text-xs z-20 border border-slate-800 pointer-events-none"
            style={{ left: `${(hovered / Math.max(1, data.length - 1)) * 85}%`, top: "6px" }}
          >
            <p className="font-bold text-[10px] text-gray-400">
              {bucketLabel(data[hovered]!.date, granularity)}
            </p>
            <p className="font-semibold mt-1 text-red-400">Resolved: {data[hovered]!.count}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 text-xs font-semibold mt-2">
        <div className="flex items-center gap-1.5 text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
          Resolved Tickets
        </div>
      </div>
    </div>
  );
}

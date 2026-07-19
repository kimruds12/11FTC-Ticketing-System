"use client";

import { useState, useEffect } from "react";
import StatCard from "./StatCard";
import ResolutionTrendChart from "./ResolutionTrendChart";
import ByDepartmentChart from "./ByDepartmentChart";
import TopIssuesChart from "./TopIssuesChart";

/**
 * AdminDashboard Component
 *
 * Designed for IT Administrators.
 * Shows high-level statistics, system health, and sync logs.
 */
export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [periodFilter, setPeriodFilter] = useState("overall");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 w-full px-4 md:px-8 py-6">
      {/* ── Greeting Banner ──────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white rounded-full translate-y-1/2" />
        </div>

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                IT Administrator Portal
              </span>
              <span className="text-xs font-semibold text-slate-400">System Management Console</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">System Status: Optimal</h1>
            <p className="text-sm text-slate-300 mt-1 font-medium">
              Overseeing 11FTC infrastructure &amp; synchronization systems • {formattedDate}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight">{formattedTime}</div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{formattedDate}</p>
          </div>
        </div>
      </div>

      {/* ── Period Filter + Actions Row ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {["overall", "today", "week", "month", "year"].map((opt) => (
              <button
                key={opt}
                onClick={() => setPeriodFilter(opt)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 capitalize ${
                  periodFilter === opt
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Refresh and Export Buttons */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline py-2 px-3.5 flex items-center gap-1.5 shadow-sm text-xs font-bold bg-white"
          >
            <svg
              className={`w-4 h-4 text-gray-500 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H17.77" />
            </svg>
            Refresh
          </button>
          <button className="btn-primary py-2.5 px-4 shadow-sm text-xs font-bold leading-none bg-slate-900 hover:bg-slate-800 text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* ── Stat Cards (Restored values as requested) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Users (Technicians)"
          value="4"
          badge="All Online"
          badgeColor="bg-green-50 text-green-700 border border-green-200"
          iconBg="bg-blue-50"
          icon={
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />

        <StatCard
          title="Google Sheets Sync Status"
          value="100%"
          badge="Synced"
          badgeColor="bg-green-50 text-green-700 border border-green-200"
          iconBg="bg-green-50"
          icon={
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="BullMQ Job Backlog"
          value="0"
          badge="Empty Queue"
          badgeColor="bg-gray-100 text-gray-700 border border-gray-200"
          iconBg="bg-gray-50"
          icon={
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />

        <StatCard
          title="First-Time Fix Rate"
          value="92%"
          badge="High Efficiency"
          badgeColor="bg-primary-50 text-primary-700 border border-primary-200"
          iconBg="bg-primary-50"
          icon={
            <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      {/* ── Charts Row ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2 space-y-4">
          <ResolutionTrendChart />
        </div>

        <div className="card p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">By Department</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Administrative ticket distribution (FR-18)</p>
          </div>
          <ByDepartmentChart />
        </div>
      </div>

      {/* ── Bottom Section ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-base font-bold text-gray-900">Main Issue Categories</h2>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Top issues count and percentage (FR-20)</p>
            </div>
          </div>
          <TopIssuesChart />
        </div>

        {/* Sync Status / Logs Panel (Restored logs) */}
        <div className="card p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Google Sheets Sync Logs</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Status of M7 outbox and worker (M8)</p>
          </div>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {[
              { id: "1", ticket: "IT-2026-0192", time: "2 mins ago", msg: "Outbox row drained successfully" },
              { id: "2", ticket: "IT-2026-0191", time: "12 mins ago", msg: "Outbox row drained successfully" },
              { id: "3", ticket: "IT-2026-0189", time: "1 hour ago", msg: "Outbox row drained successfully" },
              { id: "4", ticket: "IT-2026-0188", time: "2 hours ago", msg: "Outbox row drained successfully" },
            ].map((log) => (
              <div key={log.id} className="flex justify-between items-start p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <span className="text-xs font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200">
                    {log.ticket}
                  </span>
                  <p className="text-xs text-gray-600 mt-1 font-medium">{log.msg}</p>
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

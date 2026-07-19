"use client";

import { useState } from "react";

/**
 * Generate Reports Page
 *
 * Aligned with the 5th picture:
 *  - "Report Console" title and "Real-time administrative data metrics audits..." subtitle.
 *  - "Report Customizer" section with a clean horizontal layout:
 *     - DEPARTMENT dropdown (containing the exact list of 21 departments)
 *     - MAIN ISSUE dropdown
 *     - CHOOSE MONTH (Month-Year selector)
 *     - Generate Report button, Export Excel, Export PDF
 *  - Bottom section: "Report Compilation" showing how many tickets were created by department on each month.
 */

const DEPARTMENTS = [
  "Sales",
  "Accounting",
  "CED",
  "HR",
  "Digitech & IT",
  "Digital",
  "Executives",
  "Laser / Bodor",
  "Painting",
  "Design",
  "Finishing",
  "Purchasing",
  "1sari",
  "Logistics-Cubicle1",
  "IT",
  "Maintenance",
  "Tooling",
  "Warehouse",
  "Cubicle 4",
  "Multimedia",
  "Gate2"
];

const MAIN_ISSUES = [
  "All Issues",
  "VPN Connection Failing",
  "Printer issues",
  "Hardware / Device failures",
  "Software / Licensing",
  "Access / Auth issues",
  "Network Outage"
];

const MONTHS = [
  "July 2026",
  "June 2026",
  "May 2026",
  "April 2026",
  "March 2026",
  "February 2026",
  "January 2026"
];

// Mock matrix data for report compilation: tickets created by department on each month
const compilationMockData: Record<string, Record<string, number>> = {
  "July 2026": {
    "Sales": 12, "Accounting": 8, "CED": 15, "HR": 5, "Digitech & IT": 20, "Digital": 6, "Executives": 2,
    "Laser / Bodor": 18, "Painting": 9, "Design": 14, "Finishing": 11, "Purchasing": 7, "1sari": 3,
    "Logistics-Cubicle1": 4, "IT": 25, "Maintenance": 16, "Tooling": 10, "Warehouse": 12, "Cubicle 4": 5,
    "Multimedia": 8, "Gate2": 3
  },
  "June 2026": {
    "Sales": 15, "Accounting": 10, "CED": 18, "HR": 4, "Digitech & IT": 25, "Digital": 8, "Executives": 1,
    "Laser / Bodor": 14, "Painting": 11, "Design": 16, "Finishing": 13, "Purchasing": 8, "1sari": 2,
    "Logistics-Cubicle1": 5, "IT": 28, "Maintenance": 19, "Tooling": 12, "Warehouse": 15, "Cubicle 4": 6,
    "Multimedia": 9, "Gate2": 4
  },
  "May 2026": {
    "Sales": 9, "Accounting": 6, "CED": 12, "HR": 3, "Digitech & IT": 18, "Digital": 4, "Executives": 3,
    "Laser / Bodor": 16, "Painting": 8, "Design": 12, "Finishing": 9, "Purchasing": 5, "1sari": 4,
    "Logistics-Cubicle1": 3, "IT": 22, "Maintenance": 14, "Tooling": 8, "Warehouse": 10, "Cubicle 4": 4,
    "Multimedia": 7, "Gate2": 2
  }
};

export default function GenerateReportsPage() {
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [selectedIssue, setSelectedIssue] = useState("All Issues");
  const [selectedMonth, setSelectedMonth] = useState("July 2026");
  const [isGenerated, setIsGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsGenerated(true);
    }, 800);
  };

  // Get ticket counts for compiling the compilation table
  const getCompiledCount = (dept: string, month: string) => {
    return compilationMockData[month]?.[dept] ?? 0;
  };

  return (
    <div className="space-y-8 w-full px-4 md:px-8 py-6">
      {/* ── Header / Title ────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Generate Reports</h1>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
          <span>Reports Console</span>
          <span>/</span>
          <span className="font-semibold text-gray-700">Audit Customizer</span>
        </div>
      </div>

      {/* ── Report Console (PLV-QLib styled card) ──── */}
      <div className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Report Console</h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Real-time administrative data metrics audits for 11FTC support system
          </p>
        </div>

        {/* Report Customizer Controls in Row */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <svg className="w-4 h-4 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-xs font-bold text-gray-700 tracking-wider">Report Customizer</span>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Department */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  DEPARTMENT
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="input bg-gray-50 cursor-pointer font-semibold text-sm text-gray-700"
                >
                  <option value="All Departments">All Departments</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Main Issue */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  MAIN ISSUE
                </label>
                <select
                  value={selectedIssue}
                  onChange={(e) => setSelectedIssue(e.target.value)}
                  className="input bg-gray-50 cursor-pointer font-semibold text-sm text-gray-700"
                >
                  {MAIN_ISSUES.map((issue) => (
                    <option key={issue} value={issue}>{issue}</option>
                  ))}
                </select>
              </div>

              {/* Choose Month */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  CHOOSE MONTH
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="input bg-gray-50 cursor-pointer font-semibold text-sm text-gray-700"
                >
                  {MONTHS.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions row: Generate on Left, Exports on Right */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100">
              {/* Generate Button on Left (aligned below department dropdown) */}
              <div className="w-full sm:w-auto">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full sm:w-auto btn-primary bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg text-sm flex items-center justify-center gap-2 border border-transparent shadow-sm"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Compiling...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H17.77" />
                      </svg>
                      Generate Report
                    </>
                  )}
                </button>
              </div>

              {/* Export Buttons on Right */}
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button className="btn-outline bg-white hover:bg-gray-50 border-gray-200 py-2.5 px-4 text-xs font-bold flex items-center gap-1.5 text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Excel
                </button>
                <button className="btn-outline bg-white hover:bg-gray-50 border-gray-200 py-2.5 px-4 text-xs font-bold flex items-center gap-1.5 text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ── Generated Output & Compilation Tables ──────── */}
      <div className="card p-6 space-y-8">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Report Compilation</h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Overview of support ticket distribution by department across active months (FR-18)
          </p>
        </div>

        {isGenerated ? (
          <div className="space-y-8">
            {/* Filter description banner */}
            <div className="bg-primary-50/50 border border-primary-100 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-primary-950">Active Filters Summary</p>
                <p className="text-xs text-primary-700 font-medium mt-0.5">
                  Showing generated report for <span className="font-bold">{selectedDept}</span> • <span className="font-bold">{selectedIssue}</span> • <span className="font-bold">{selectedMonth}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  SYNCED WITH GOOGLE SHEETS
                </span>
              </div>
            </div>

            {/* Grid layout of data tables */}
            <div className="space-y-6">
              {/* Detailed compilation matrix */}
              <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      <th className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider">
                        DEPARTMENT
                      </th>
                      {MONTHS.slice(0, 3).map((month) => (
                        <th key={month} className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider text-center">
                          {month.toUpperCase()}
                        </th>
                      ))}
                      <th className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider text-center">
                        TOTAL TICKETS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {DEPARTMENTS.filter(d => selectedDept === "All Departments" || d === selectedDept).map((dept) => {
                      const m1 = getCompiledCount(dept, "July 2026");
                      const m2 = getCompiledCount(dept, "June 2026");
                      const m3 = getCompiledCount(dept, "May 2026");
                      const rowTotal = m1 + m2 + m3;
                      
                      return (
                        <tr key={dept} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3.5 whitespace-nowrap text-sm font-bold text-gray-900">
                            {dept}
                          </td>
                          <td className="px-6 py-3.5 text-center text-sm font-semibold text-gray-600 tabular-nums">
                            {m1}
                          </td>
                          <td className="px-6 py-3.5 text-center text-sm font-semibold text-gray-600 tabular-nums">
                            {m2}
                          </td>
                          <td className="px-6 py-3.5 text-center text-sm font-semibold text-gray-600 tabular-nums">
                            {m3}
                          </td>
                          <td className="px-6 py-3.5 text-center text-sm font-bold text-primary-700 tabular-nums bg-gray-50/50">
                            {rowTotal}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Grand Total row */}
                    {selectedDept === "All Departments" && (
                      <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          GRAND TOTAL
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 tabular-nums">
                          {DEPARTMENTS.reduce((sum, d) => sum + getCompiledCount(d, "July 2026"), 0)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 tabular-nums">
                          {DEPARTMENTS.reduce((sum, d) => sum + getCompiledCount(d, "June 2026"), 0)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 tabular-nums">
                          {DEPARTMENTS.reduce((sum, d) => sum + getCompiledCount(d, "May 2026"), 0)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-primary-700 tabular-nums bg-gray-100/50">
                          {DEPARTMENTS.reduce((sum, d) => sum + getCompiledCount(d, "July 2026") + getCompiledCount(d, "June 2026") + getCompiledCount(d, "May 2026"), 0)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state pending compilation */
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-base font-bold text-gray-800 uppercase tracking-wide">
              AUDIT DATA PENDING COMPILATION
            </p>
            <p className="text-xs text-gray-400 font-semibold max-w-sm mt-1 leading-relaxed">
              Select department, main issue category, and target month, then click Generate Report to fetch synced Google Sheets data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

/**
 * TicketFilters — Search and filter controls for the ticket queue.
 *
 * Per FR-3: Filter by date range, status, department, main issue, employee, assigned technician.
 * Status options: Open, Ongoing, Closed only.
 */

interface TicketFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  department: string;
  onDepartmentChange: (val: string) => void;
  issue: string;
  onIssueChange: (val: string) => void;
}

export default function TicketFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  department,
  onDepartmentChange,
  issue,
  onIssueChange,
}: TicketFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white p-4 rounded-xl border border-gray-200 shadow-card">
      {/* ── Search Input ──────────────────────────── */}
      <div className="relative flex-1 max-w-md">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tickets by ID, Employee, or Issue..."
          className="input pl-9 w-full"
          aria-label="Search tickets"
        />
      </div>

      {/* ── Filter Dropdowns + Create Button ──────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Dropdown — Only Open/Ongoing/Closed per SRS */}
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
          <span className="text-gray-400 mr-1.5 text-xs font-medium">Status:</span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-transparent focus:outline-none cursor-pointer font-semibold text-sm"
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="Open">Open</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {/* Main Issue Dropdown (Picture 4 Aligned) */}
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
          <span className="text-gray-400 mr-1.5 text-xs font-medium">Issue:</span>
          <select
            value={issue}
            onChange={(e) => onIssueChange(e.target.value)}
            className="bg-transparent focus:outline-none cursor-pointer font-semibold text-sm"
            aria-label="Filter by main issue"
          >
            <option value="all">All</option>
            <option value="Network">Network</option>
            <option value="Printer">Printer</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Email">Email</option>
            <option value="ERP">ERP</option>
            <option value="Account/Login">Account/Login</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Department Dropdown */}
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
          <span className="text-gray-400 mr-1.5 text-xs font-medium">Dept:</span>
          <select
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="bg-transparent focus:outline-none cursor-pointer font-semibold text-sm"
            aria-label="Filter by department"
          >
            <option value="all">All</option>
            <option value="Sales">Sales</option>
            <option value="Accounting">Accounting</option>
            <option value="CED">CED</option>
            <option value="HR">HR</option>
            <option value="Digitech & IT">Digitech & IT</option>
            <option value="Digital">Digital</option>
            <option value="Executives">Executives</option>
            <option value="LASER/BODOR">LASER/BODOR</option>
            <option value="Painting">Painting</option>
            <option value="Design">Design</option>
            <option value="Finishing">Finishing</option>
            <option value="Purchasing">Purchasing</option>
            <option value="1sari">1sari</option>
            <option value="Whole office">Whole office</option>
            <option value="Logistics-cubicle 1">Logistics-cubicle 1</option>
            <option value="IT">IT</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Tooling">Tooling</option>
            <option value="Warehouse">Warehouse</option>
            <option value="Cubicle 4">Cubicle 4</option>
            <option value="Multimedia">Multimedia</option>
            <option value="Gate2">Gate2</option>
          </select>
        </div>

        {/* Create Ticket Button */}
        <Link href="/tickets/new" className="btn-primary py-2 px-4 shadow-sm text-xs font-bold leading-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Create Ticket
        </Link>
      </div>
    </div>
  );
}

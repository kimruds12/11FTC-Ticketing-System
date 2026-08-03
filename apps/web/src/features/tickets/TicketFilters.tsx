"use client";

import Link from "next/link";
import {
  TicketStatus,
  type DepartmentDto,
  type MainIssueDto,
  type TechnicianDto,
} from "@11ftc/shared";

/**
 * TicketFilters — search + filter controls for the queue (FR-3): date range, status,
 * department, main issue, technician, free-text search.
 *
 * Department, main-issue and technician options come from the server via props — they are
 * NEVER hardcoded here. The real lists belong to the IT team (OPEN-4); an invented list in
 * the UI looks authoritative and is wrong. Values are UUIDs so the API filters by id.
 */

export interface TicketFilterValues {
  q: string;
  status: string;
  departmentId: string;
  mainIssueId: string;
  technicianId: string;
  dateFrom: string;
  dateTo: string;
}

interface TicketFiltersProps {
  values: TicketFilterValues;
  onChange: (patch: Partial<TicketFilterValues>) => void;
  onReset: () => void;
  departments: DepartmentDto[];
  mainIssues: MainIssueDto[];
  technicians: TechnicianDto[];
}

export default function TicketFilters({
  values,
  onChange,
  onReset,
  departments,
  mainIssues,
  technicians,
}: TicketFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-card space-y-3">
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        {/* ── Search ──────────────────────────────── */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            value={values.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Search by ticket no, employee, or concern..."
            className="input pl-9 w-full"
            aria-label="Search tickets"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status — the three documented statuses only (SRS §4.1) */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
            <span className="text-gray-400 mr-1.5 text-xs font-medium">Status:</span>
            <select
              value={values.status}
              onChange={(e) => onChange({ status: e.target.value })}
              className="bg-transparent focus:outline-none cursor-pointer font-semibold text-sm"
              aria-label="Filter by status"
            >
              <option value="">All</option>
              <option value={TicketStatus.OPEN}>Open</option>
              <option value={TicketStatus.ONGOING}>Ongoing</option>
              <option value={TicketStatus.CLOSED}>Closed</option>
            </select>
          </div>

          {/* Main issue — from M2 lookups */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
            <span className="text-gray-400 mr-1.5 text-xs font-medium">Issue:</span>
            <select
              value={values.mainIssueId}
              onChange={(e) => onChange({ mainIssueId: e.target.value })}
              className="bg-transparent focus:outline-none cursor-pointer font-semibold text-sm max-w-[160px]"
              aria-label="Filter by main issue"
            >
              <option value="">All</option>
              {mainIssues.map((mi) => (
                <option key={mi.mainIssueId} value={mi.mainIssueId}>
                  {mi.label}
                </option>
              ))}
            </select>
          </div>

          {/* Department — from M2 lookups */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
            <span className="text-gray-400 mr-1.5 text-xs font-medium">Dept:</span>
            <select
              value={values.departmentId}
              onChange={(e) => onChange({ departmentId: e.target.value })}
              className="bg-transparent focus:outline-none cursor-pointer font-semibold text-sm max-w-[160px]"
              aria-label="Filter by department"
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Technician — matches if they are ONE of the ticket's handlers (ADR-0017). */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
            <span className="text-gray-400 mr-1.5 text-xs font-medium">Handled by:</span>
            <select
              value={values.technicianId}
              onChange={(e) => onChange({ technicianId: e.target.value })}
              className="bg-transparent focus:outline-none cursor-pointer font-semibold text-sm max-w-[140px]"
              aria-label="Filter by technician"
            >
              <option value="">Anyone</option>
              {technicians.map((t) => (
                <option key={t.technicianId} value={t.technicianId}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/tickets/new"
            className="btn-primary py-2 px-4 shadow-sm text-xs font-bold leading-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Encode Ticket
          </Link>
        </div>
      </div>

      {/* ── Date range (FR-3) ─────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-100">
        <div className="flex items-center gap-2 pt-2">
          <label htmlFor="dateFrom" className="text-xs font-medium text-gray-400">
            From:
          </label>
          <input
            id="dateFrom"
            type="date"
            value={values.dateFrom}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
            className="input py-1.5 text-xs font-semibold"
          />
          <label htmlFor="dateTo" className="text-xs font-medium text-gray-400 ml-1">
            To:
          </label>
          <input
            id="dateTo"
            type="date"
            value={values.dateTo}
            onChange={(e) => onChange({ dateTo: e.target.value })}
            className="input py-1.5 text-xs font-semibold"
          />
        </div>
        <button
          onClick={onReset}
          className="pt-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}

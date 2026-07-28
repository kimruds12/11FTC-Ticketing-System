"use client";

import { use } from "react";
import Link from "next/link";
import StatusBadge from "@/features/tickets/StatusBadge";

interface MockTicketDetail {
  id: string;
  ticketNo: string;
  date: string;
  status: "OPEN" | "ONGOING" | "CLOSED" | string;
  employee: string;
  department: string;
  mainIssue: string;
  description: string;
  assignedTo: string;
  audits: {
    field: string;
    oldVal: string;
    newVal: string;
    updatedBy: string;
    updatedAt: string;
  }[];
}

const MOCK_TICKET: MockTicketDetail = {
  id: "INC-8842",
  ticketNo: "IT-2026-0842",
  date: "Oct 24, 2026",
  status: "OPEN",
  employee: "Sarah Jenkins",
  department: "Finance",
  mainIssue: "Network / VPN",
  description: "VPN client reports authentication timeout when attempting to connect to internal payroll servers. This issue started occurring after the security update on Oct 23. Employee cannot perform daily settlement tasks.",
  assignedTo: "John Doe",
  audits: [
    {
      field: "status",
      oldVal: "N/A",
      newVal: "OPEN",
      updatedBy: "Sarah Jenkins",
      updatedAt: "Oct 24, 2026, 09:12",
    },
    {
      field: "assignedTo",
      oldVal: "Unassigned",
      newVal: "John Doe",
      updatedBy: "IT System",
      updatedAt: "Oct 24, 2026, 09:15",
    },
  ],
};

export default function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.ticketId;

  return (
    <div className="max-w-[900px] mx-auto space-y-6 md:space-y-8">
      {/* Back Button & Title */}
      <div className="space-y-2">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Ticket Queue
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                {ticketId}
              </h1>
              <StatusBadge status={MOCK_TICKET.status} />
            </div>
            <p className="text-sm text-gray-400 font-semibold mt-1">
              Ticket Sequence: {MOCK_TICKET.ticketNo} • Created on {MOCK_TICKET.date}
            </p>
          </div>
          <button className="btn-primary self-start sm:self-auto shadow-sm">Edit Ticket</button>
        </div>
      </div>

      {/* Ticket Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detail Card */}
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">Issue Details</h2>
            <div className="border-t border-gray-100 my-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Employee</p>
              <p className="font-bold text-gray-900 mt-1">{MOCK_TICKET.employee}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Department</p>
              <p className="font-bold text-gray-900 mt-1">{MOCK_TICKET.department}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Category</p>
              <p className="font-bold text-gray-900 mt-1">{MOCK_TICKET.mainIssue}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Assigned Agent</p>
              <p className="font-bold text-gray-900 mt-1">{MOCK_TICKET.assignedTo}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Description</p>
            <p className="text-sm text-gray-700 font-medium leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
              {MOCK_TICKET.description}
            </p>
          </div>
        </div>

        {/* Audit Log Side Card */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Audit History</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Application layer audit trail.</p>
          </div>
          <div className="border-t border-gray-100" />
          
          <div className="space-y-4 relative pl-3 border-l-2 border-primary-100">
            {MOCK_TICKET.audits.map((audit, i) => (
              <div key={i} className="relative space-y-1">
                {/* Visual marker dot */}
                <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-primary-700 border-2 border-white ring-4 ring-primary-50" />
                
                <div className="text-xs font-bold text-gray-900">
                  Updated <span className="text-primary-700">{audit.field}</span>
                </div>
                <div className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                  Change: {audit.oldVal} &rarr; {audit.newVal}
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  By {audit.updatedBy} • {audit.updatedAt}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

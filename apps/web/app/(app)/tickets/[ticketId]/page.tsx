"use client";

import { useState } from "react";
import Link from "next/link";
import { use } from "react";

/* ── Mock ticket data ─────────────────────────────────────── */
const MOCK_TICKET = {
  id: "INC-8842",
  ticketNo: "IT-2026-0842",
  date: "Oct 24, 2026",
  status: "OPEN" as "OPEN" | "ONGOING" | "CLOSED",
  employee: "Sarah Jenkins",
  department: "Finance",
  mainIssue: "Network / VPN",
  concern: "VPN Connection Failing Post Update — User is unable to connect to the corporate VPN after the latest system update. The error message shows Authentication timeout.",
  assignedTo: "John Doe",
  remarks: "",
  ongoingAt: null as string | null,
  closedAt: null as string | null,
  createdBy: "Admin User",
  createdAt: "Oct 24, 2026 09:12",
  updatedAt: "Oct 24, 2026 09:12",
};

const MOCK_AUDIT = [
  {
    id: "1",
    action: "CREATE",
    fieldName: "status",
    previousValue: null,
    newValue: "Open",
    updatedBy: "Admin User",
    updatedAt: "Oct 24, 2026 09:12",
  },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "bg-blue-50 text-blue-700 border border-blue-200",
    ONGOING: "bg-amber-50 text-amber-700 border border-amber-200",
    CLOSED: "bg-green-50 text-green-700 border border-green-200",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const [editMode, setEditMode] = useState(false);
  const [remarks, setRemarks] = useState(MOCK_TICKET.remarks);
  const [concern, setConcern] = useState(MOCK_TICKET.concern);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const ticket = { ...MOCK_TICKET, id: ticketId };
  const isClosed = ticket.status === "CLOSED";

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setEditMode(false);
    setSuccessMsg("Ticket updated successfully.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleTransition = async (to: string) => {
    // TODO: POST /tickets/:id/ongoing or /close via api.ts
    alert(`Transition to ${to} — API call here`);
  };

  return (
    <div className="space-y-5 max-w-[900px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/tickets" className="hover:text-gray-600">Ticket Management</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-mono font-semibold">{ticket.id}</span>
      </div>

      {/* ── Ticket Header ───────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{ticket.ticketNo}</h1>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">Reported by {ticket.employee} · {ticket.date}</p>
            {ticket.ongoingAt && (
              <p className="text-xs text-amber-600 mt-1">Ongoing since {ticket.ongoingAt}</p>
            )}
            {ticket.closedAt && (
              <p className="text-xs text-green-600 mt-1">Closed at {ticket.closedAt}</p>
            )}
          </div>

          {/* Actions — only shown if not Closed (FR-8) */}
          {!isClosed && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {ticket.status === "OPEN" && (
                <button
                  onClick={() => handleTransition("ONGOING")}
                  className="btn-outline text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  Mark Ongoing
                </button>
              )}
              <button
                onClick={() => handleTransition("CLOSED")}
                className="btn-primary bg-green-600 hover:bg-green-700"
              >
                Close Ticket
              </button>
              <button
                onClick={() => setEditMode((v) => !v)}
                className="btn-outline"
              >
                {editMode ? "Cancel" : "Edit"}
              </button>
            </div>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Details ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Ticket Details</h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Department</span>
                <p className="text-gray-800 mt-0.5 font-medium">{ticket.department}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Main Issue</span>
                <p className="text-gray-800 mt-0.5 font-medium">{ticket.mainIssue}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Assigned To</span>
                <p className="text-gray-800 mt-0.5 font-medium">{ticket.assignedTo}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Created By</span>
                <p className="text-gray-800 mt-0.5 font-medium">{ticket.createdBy}</p>
              </div>
            </div>

            {/* Concern */}
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Concern</span>
              {editMode ? (
                <textarea
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  rows={3}
                  className="input mt-1.5 resize-none text-sm"
                />
              ) : (
                <p className="text-gray-700 mt-1 text-sm leading-relaxed">{concern}</p>
              )}
            </div>

            {/* Remarks */}
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Remarks</span>
              {editMode ? (
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="input mt-1.5 resize-none text-sm"
                  placeholder="Resolution notes…"
                />
              ) : (
                <p className="text-gray-500 mt-1 text-sm italic">
                  {remarks || "No remarks yet."}
                </p>
              )}
            </div>

            {editMode && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={() => setEditMode(false)} className="btn-outline">
                  Discard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Audit History ─────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Audit History</h2>
          <div className="space-y-3">
            {MOCK_AUDIT.map((entry) => (
              <div key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary-700 mt-1 flex-shrink-0" />
                  <div className="w-px flex-1 bg-gray-100 mt-1" />
                </div>
                <div className="pb-3">
                  <p className="text-xs font-semibold text-gray-700">
                    {entry.action}
                    {entry.fieldName && (
                      <span className="text-gray-400 font-normal"> — {entry.fieldName}</span>
                    )}
                  </p>
                  {(entry.previousValue || entry.newValue) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {entry.previousValue ?? "—"} → {entry.newValue ?? "—"}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {entry.updatedBy} · {entry.updatedAt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

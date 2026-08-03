"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  formatAssignees,
  TicketStatus,
  type AuditEntryDto,
  type MainIssueDto,
  type TicketDetailDto,
} from "@11ftc/shared";
import StatusBadge from "./StatusBadge";
import { formatSheetDate, formatSheetStamp } from "@/lib/utils";
import AssigneePicker from "./AssigneePicker";
import {
  assignTicketAction,
  closeTicketAction,
  markOngoingAction,
  updateTicketAction,
} from "./actions";

/**
 * Ticket detail (M5 lifecycle + M6 history). The buttons shown mirror what the server will
 * actually allow — but the server is the authority: the state machine lives there and an
 * illegal transition comes back as 409, which is surfaced inline rather than swallowed.
 *
 * Closed is terminal (FR-8): no reopen control exists. Corrections are still permitted on a
 * Closed ticket (FR-9) — the audit log carries them. Nothing is ever deleted, so there is no
 * delete control anywhere on this page.
 */
interface TicketDetailClientProps {
  ticket: TicketDetailDto;
  mainIssues: MainIssueDto[];
}

function humanizeField(field: string): string {
  const label = field.replace(/_id$/, "").replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Timestamps use the same M/D/YYYY convention as dates, so nothing on this page reads in a
// different format from the spreadsheet. See @/lib/utils/date.
const formatStamp = formatSheetStamp;

export default function TicketDetailClient({
  ticket,
  mainIssues,
}: TicketDetailClientProps) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [closing, setClosing] = useState(false);

  const [concern, setConcern] = useState(ticket.concern);
  const [remarks, setRemarks] = useState(ticket.remarks ?? "");
  const [mainIssueId, setMainIssueId] = useState(ticket.mainIssueId);
  const [closeRemarks, setCloseRemarks] = useState("");

  // Names, not ids: a technician typed here for the first time has no id yet — the API
  // resolve-or-creates on save, the same way the encode form works.
  const [draftAssignees, setDraftAssignees] = useState(ticket.assignees.map((a) => a.name));
  const assigneesChanged =
    formatAssignees(draftAssignees.map((name) => ({ technicianId: name, name }))) !==
    formatAssignees(ticket.assignees);

  const isClosed = ticket.status === TicketStatus.CLOSED;
  const canMarkOngoing = ticket.status === TicketStatus.OPEN;
  const canClose = !isClosed;

  /** Every mutation funnels through here so error handling and refresh stay identical. */
  function run(action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Unexpected error");
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 md:space-y-8 px-4 md:px-8 py-6">
      {/* ── Header ─────────────────────────────────── */}
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
                {ticket.ticketNo}
              </h1>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="text-sm text-gray-400 font-semibold mt-1">
              Concern dated {formatSheetDate(ticket.date)} • Encoded {formatStamp(ticket.createdAt)}
            </p>
          </div>

          {/* ── Lifecycle actions ─────────────────── */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {canMarkOngoing && (
              <button
                onClick={() => run(() => markOngoingAction(ticket.ticketId))}
                disabled={busy}
                className="btn-outline text-xs font-bold py-2 px-3.5 bg-white text-amber-700 border-amber-200 hover:bg-amber-50 disabled:opacity-60"
              >
                Mark Ongoing
              </button>
            )}
            {canClose && (
              <button
                onClick={() => setClosing((v) => !v)}
                disabled={busy}
                className="btn-primary text-xs font-bold py-2 px-3.5 bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-60"
              >
                Close Ticket
              </button>
            )}
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                disabled={busy}
                className="btn-outline text-xs font-bold py-2 px-3.5 bg-white disabled:opacity-60"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {isClosed && (
          <p className="text-[11px] font-semibold text-gray-400">
            This ticket is Closed — a terminal state. A recurrence must be encoded as a new
            ticket.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* ── Close confirmation (optional remarks) ──── */}
      {closing && canClose && (
        <div className="card p-5 space-y-3 border-teal-200 bg-teal-50/40">
          <h2 className="text-sm font-bold text-gray-900">Close this ticket</h2>
          <p className="text-xs text-gray-500 font-medium">
            Closing is permanent. Add closing remarks if useful.
          </p>
          <textarea
            rows={2}
            value={closeRemarks}
            onChange={(e) => setCloseRemarks(e.target.value)}
            placeholder="Optional closing remarks..."
            className="input w-full resize-none text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setClosing(false)}
              className="btn-outline text-xs font-bold py-2 px-3.5 bg-white"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                run(
                  () =>
                    closeTicketAction(ticket.ticketId, {
                      remarks: closeRemarks.trim() || null,
                    }),
                  () => setClosing(false),
                )
              }
              disabled={busy}
              className="btn-primary text-xs font-bold py-2 px-4 bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-60"
            >
              {busy ? "Closing..." : "Confirm Close"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Detail card ──────────────────────────── */}
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">Issue Details</h2>
            <div className="border-t border-gray-100 mt-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Employee</p>
              <p className="font-bold text-gray-900 mt-1">{ticket.employeeName ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Department</p>
              <p className="font-bold text-gray-900 mt-1">{ticket.department ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Main Issue</p>
              <p className="font-bold text-gray-900 mt-1">{ticket.mainIssue ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Handled By
              </p>
              <p className="font-bold text-gray-900 mt-1">
                {formatAssignees(ticket.assignees) ?? (
                  <span className="text-gray-400 italic font-medium">Unassigned</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ongoing At</p>
              <p className="font-semibold text-gray-600 mt-1 text-xs">
                {ticket.ongoingAt ? formatStamp(ticket.ongoingAt) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Closed At</p>
              <p className="font-semibold text-gray-600 mt-1 text-xs">
                {ticket.closedAt ? formatStamp(ticket.closedAt) : "—"}
              </p>
            </div>
          </div>

          {editing ? (
            /* ── Correction form (FR-9) ─────────── */
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 pt-2">Correct this ticket</h3>

              <div>
                <label htmlFor="mainIssueId" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Main Issue
                </label>
                <select
                  id="mainIssueId"
                  value={mainIssueId}
                  onChange={(e) => setMainIssueId(e.target.value)}
                  className="input bg-gray-50 cursor-pointer font-semibold text-sm w-full"
                >
                  {mainIssues.map((mi) => (
                    <option key={mi.mainIssueId} value={mi.mainIssueId}>
                      {mi.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="concern" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Concern
                </label>
                <textarea
                  id="concern"
                  rows={4}
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  className="input w-full resize-none text-sm"
                />
              </div>

              <div>
                <label htmlFor="remarks" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Remarks
                </label>
                <input
                  id="remarks"
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input w-full text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setEditing(false);
                    setConcern(ticket.concern);
                    setRemarks(ticket.remarks ?? "");
                    setMainIssueId(ticket.mainIssueId);
                  }}
                  className="btn-outline text-xs font-bold py-2 px-3.5 bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    run(
                      () =>
                        updateTicketAction(ticket.ticketId, {
                          concern: concern.trim(),
                          remarks: remarks.trim() || null,
                          mainIssueId,
                        }),
                      () => setEditing(false),
                    )
                  }
                  disabled={busy || concern.trim().length === 0}
                  className="btn-primary text-xs font-bold py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-60"
                >
                  {busy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 pt-2">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Concern</p>
                <p className="text-sm text-gray-700 font-medium leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">
                  {ticket.concern}
                </p>
              </div>
              {ticket.remarks && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Remarks</p>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    {ticket.remarks}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Who handled it (any authenticated role — ADR-0017) ──
              Available on Closed tickets too: correcting the record is an edit, not a reopen
              (FR-9). Saving sends the FULL list, so removing every chip means "unassigned". */}
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">
              Handled By
            </label>
            <AssigneePicker value={draftAssignees} onChange={setDraftAssignees} disabled={busy} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy || !assigneesChanged}
                onClick={() =>
                  run(() =>
                    assignTicketAction(ticket.ticketId, { assignees: draftAssignees }),
                  )
                }
                className="btn-outline text-xs font-bold py-1.5 px-3 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Saving…" : "Save"}
              </button>
              {assigneesChanged && !busy && (
                <button
                  type="button"
                  onClick={() => setDraftAssignees(ticket.assignees.map((a) => a.name))}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Audit history (M6) ───────────────────── */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Audit History</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              One entry per changed field, newest first.
            </p>
          </div>
          <div className="border-t border-gray-100" />

          {ticket.history.length === 0 ? (
            <p className="text-xs text-gray-400 font-medium py-4 text-center">
              No audit entries recorded.
            </p>
          ) : (
            <ol className="space-y-4 relative pl-3 border-l-2 border-primary-100">
              {ticket.history.map((entry: AuditEntryDto) => (
                <li key={entry.auditLogId} className="relative space-y-1">
                  <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-primary-700 border-2 border-white ring-4 ring-primary-50" />
                  <div className="text-xs font-bold text-gray-900">
                    {entry.action}{" "}
                    <span className="text-primary-700">{humanizeField(entry.fieldName)}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-semibold leading-relaxed break-words">
                    {entry.previousValue ?? "—"} &rarr; {entry.newValue ?? "—"}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">
                    {entry.updatedByName ?? "System user"} • {formatStamp(entry.updatedAt)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

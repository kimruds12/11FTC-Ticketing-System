"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  formatAssignees,
  TicketStatus,
  type AuditEntryDto,
  type MainIssueDto,
  type TicketDetailDto,
  type UpdateTicketDto,
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
  if (field === "main_issue" || field === "main_issue_id") return "Main issue";
  if (field === "assignees" || field === "handled_by" || field === "Handled by") return "Handled by";
  if (field === "concern") return "Concern";
  if (field === "remarks") return "Remarks";
  const label = field.replace(/_id$/, "").replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Timestamps use the same M/D/YYYY convention as dates, so nothing on this page reads in a
// different format from the spreadsheet. See @/lib/utils/date.
const formatStamp = formatSheetStamp;

interface AuditGroup {
  id: string;
  action: string;
  updatedByName: string | null;
  updatedAt: string;
  entries: AuditEntryDto[];
}

function groupAuditHistory(history: AuditEntryDto[]): AuditGroup[] {
  const groups: AuditGroup[] = [];

  for (const entry of history) {
    const lastGroup = groups[groups.length - 1];
    const isSameBatch =
      lastGroup &&
      lastGroup.action === entry.action &&
      lastGroup.updatedByName === entry.updatedByName &&
      (lastGroup.updatedAt === entry.updatedAt ||
        Math.abs(new Date(lastGroup.updatedAt).getTime() - new Date(entry.updatedAt).getTime()) < 3000);

    if (isSameBatch) {
      lastGroup.entries.push(entry);
    } else {
      groups.push({
        id: entry.auditLogId,
        action: entry.action,
        updatedByName: entry.updatedByName,
        updatedAt: entry.updatedAt,
        entries: [entry],
      });
    }
  }

  return groups;
}

function formatCombinedActionTitle(action: string, entries: AuditEntryDto[]): string {
  const uniqueFields: string[] = [];
  for (const e of entries) {
    const human = humanizeField(e.fieldName);
    if (!uniqueFields.some((f) => f.toLowerCase() === human.toLowerCase())) {
      uniqueFields.push(human);
    }
  }

  if (uniqueFields.length === 1 && uniqueFields[0]) {
    return `${action} → ${uniqueFields[0]}`;
  }

  const lowerFields = uniqueFields.map((f) => f.toLowerCase());
  let combined = "";
  if (lowerFields.length === 2) {
    combined = `${lowerFields[0]} and ${lowerFields[1]}`;
  } else if (lowerFields.length > 2) {
    combined = `${lowerFields.slice(0, -1).join(", ")} and ${lowerFields[lowerFields.length - 1]}`;
  } else {
    combined = lowerFields[0] ?? "ticket";
  }
  combined = combined.charAt(0).toUpperCase() + combined.slice(1);
  return `${action} → ${combined}`;
}

export default function TicketDetailClient({
  ticket,
  mainIssues,
}: TicketDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, startTransition] = useTransition();

  const [optimisticTicket, setOptimisticTicket] = useState<TicketDetailDto | null>(null);
  const currentTicket = optimisticTicket ?? ticket;

  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [closing, setClosing] = useState(false);

  const [concern, setConcern] = useState(ticket.concern);
  const [remarks, setRemarks] = useState(ticket.remarks ?? "");
  const [mainIssueId, setMainIssueId] = useState(ticket.mainIssueId);
  const [closeRemarks, setCloseRemarks] = useState("");
  const [draftAssignees, setDraftAssignees] = useState(ticket.assignees.map((a) => a.name));
  const [pendingAssigneeText, setPendingAssigneeText] = useState("");

  useEffect(() => {
    setOptimisticTicket(null);
    if (!editing) {
      setConcern(ticket.concern);
      setRemarks(ticket.remarks ?? "");
      setMainIssueId(ticket.mainIssueId);
      setDraftAssignees(ticket.assignees.map((a) => a.name));
      setPendingAssigneeText("");
    }
  }, [ticket, editing]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isClosed = currentTicket.status === "Closed";
  const canMarkOngoing = currentTicket.status === "Open";
  const canClose = currentTicket.status !== "Closed";

  /** Every mutation funnels through here so error handling and refresh stay identical. */
  function run(action: () => Promise<{ ok: boolean; error?: string }>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Operation failed");
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  }

  function handleSaveChanges() {
    // 1. Incorporate any untyped / unsubmitted text in the technician picker
    const cleanPending = pendingAssigneeText.trim();
    const effectiveAssignees = [...draftAssignees];
    if (
      cleanPending &&
      !effectiveAssignees.some((name) => name.toLowerCase() === cleanPending.toLowerCase())
    ) {
      effectiveAssignees.push(cleanPending);
    }

    // 2. Detect what was actually configured / changed by the user
    const mainIssueChanged = mainIssueId !== currentTicket.mainIssueId;
    const concernChanged = concern.trim() !== currentTicket.concern.trim();
    const remarksChanged = (remarks.trim() || null) !== (currentTicket.remarks?.trim() || null);

    const currentNames = currentTicket.assignees.map((a) => a.name.trim());
    const effectiveNames = effectiveAssignees.map((n) => n.trim());
    const handledByChanged =
      effectiveNames.length !== currentNames.length ||
      effectiveNames.some((name, i) => name.toLowerCase() !== currentNames[i]?.toLowerCase());

    // If nothing changed, simply exit edit mode
    if (!mainIssueChanged && !concernChanged && !remarksChanged && !handledByChanged) {
      setEditing(false);
      setPendingAssigneeText("");
      return;
    }

    // 3. Build payload with ONLY what the user configured
    const payload: UpdateTicketDto = {};
    if (mainIssueChanged) payload.mainIssueId = mainIssueId;
    if (concernChanged) payload.concern = concern.trim();
    if (remarksChanged) payload.remarks = remarks.trim() || null;
    if (handledByChanged) payload.assignees = effectiveNames;

    run(
      async () => {
        const res = await updateTicketAction(currentTicket.ticketId, payload);
        if (res.ok && res.data) {
          const updated = res.data;
          setOptimisticTicket((prev) => ({
            ...(prev ?? ticket),
            ...updated,
            assignees: updated.assignees ?? (prev?.assignees ?? ticket.assignees),
          }));
        }
        return res;
      },
      () => {
        setEditing(false);
        setDraftAssignees(effectiveNames);
        setPendingAssigneeText("");
      },
    );
  }

  const groupedHistory = useMemo(
    () => groupAuditHistory(currentTicket.history),
    [currentTicket.history],
  );

  return (
    <div className="space-y-6 w-full px-4 md:px-8 py-6">
      {/* ── Top Bar ───────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-primary-700 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs hover:border-gray-300"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <span className="text-gray-300 text-sm">/</span>
          <Link
            href="/tickets"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Ticket Queue
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                {currentTicket.ticketNo}
              </h1>
              <StatusBadge status={currentTicket.status} />
            </div>
            <p className="text-sm text-gray-400 font-semibold mt-1" suppressHydrationWarning>
              Concern dated {formatSheetDate(currentTicket.date)} • Encoded <span suppressHydrationWarning>{mounted ? formatStamp(currentTicket.createdAt) : formatSheetDate(currentTicket.createdAt)}</span>
            </p>
          </div>

          {/* ── Lifecycle actions ─────────────────── */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {canMarkOngoing && (
              <button
                onClick={() => run(() => markOngoingAction(currentTicket.ticketId))}
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
                    closeTicketAction(currentTicket.ticketId, {
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
        {/* ── Detail / Correction Card ──────────────── */}
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {editing ? "Correct this ticket" : "Issue Details"}
            </h2>
            <div className="border-t border-gray-100 mt-2" />
          </div>

          {editing ? (
            /* ── Full Correction Form (Picture 3 unified) ─────────── */
            <div className="space-y-4">
              {/* Employee & Department info */}
              <div className="grid grid-cols-2 gap-4 text-sm pb-2 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Employee</p>
                  <p className="font-bold text-gray-900 mt-1">{currentTicket.employeeName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Department</p>
                  <p className="font-bold text-gray-900 mt-1">{currentTicket.department ?? "—"}</p>
                </div>
              </div>

              {/* Main Issue */}
              <div>
                <label htmlFor="mainIssueId" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  MAIN ISSUE
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

              {/* Concern */}
              <div>
                <label htmlFor="concern" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  CONCERN
                </label>
                <textarea
                  id="concern"
                  rows={4}
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  className="input w-full resize-none text-sm"
                />
              </div>

              {/* Remarks */}
              <div>
                <label htmlFor="remarks" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  REMARKS
                </label>
                <input
                  id="remarks"
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input w-full text-sm"
                />
              </div>

              {/* Handled by (Assignees) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  HANDLED BY
                </label>
                <AssigneePicker
                  value={draftAssignees}
                  onChange={setDraftAssignees}
                  onPendingTextChange={setPendingAssigneeText}
                  disabled={busy}
                />
              </div>

              {/* Single Cancel & Save Changes set at the lower right */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setConcern(currentTicket.concern);
                    setRemarks(currentTicket.remarks ?? "");
                    setMainIssueId(currentTicket.mainIssueId);
                    setDraftAssignees(currentTicket.assignees.map((a) => a.name));
                    setPendingAssigneeText("");
                  }}
                  className="btn-outline text-xs font-bold py-2 px-3.5 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={busy || concern.trim().length === 0}
                  className="btn-primary text-xs font-bold py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-60"
                >
                  {busy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            /* ── Read-only Issue Details ─────────────── */
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Employee</p>
                  <p className="font-bold text-gray-900 mt-1">{currentTicket.employeeName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Department</p>
                  <p className="font-bold text-gray-900 mt-1">{currentTicket.department ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Main Issue</p>
                  <p className="font-bold text-gray-900 mt-1">{currentTicket.mainIssue ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                    Handled By
                  </p>
                  <p className="font-bold text-gray-900 mt-1">
                    {formatAssignees(currentTicket.assignees) ?? (
                      <span className="text-gray-400 italic font-medium">Unassigned</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ongoing At</p>
                  <p className="font-semibold text-gray-600 mt-1 text-xs">
                    {currentTicket.ongoingAt ? formatStamp(currentTicket.ongoingAt) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Closed At</p>
                  <p className="font-semibold text-gray-600 mt-1 text-xs">
                    {currentTicket.closedAt ? formatStamp(currentTicket.closedAt) : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Concern</p>
                <p className="text-sm text-gray-700 font-medium leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">
                  {currentTicket.concern}
                </p>
              </div>

              {currentTicket.remarks && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Remarks</p>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    {currentTicket.remarks}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Audit history (M6) ───────────────────── */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Audit History</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              One entry per change event, newest first.
            </p>
          </div>
          <div className="border-t border-gray-100" />

          {ticket.history.length === 0 ? (
            <p className="text-xs text-gray-400 font-medium py-4 text-center">
              No audit entries recorded.
            </p>
          ) : (
            <ol className="space-y-4 relative pl-3 border-l-2 border-primary-100">
              {groupedHistory.map((group) => (
                <li key={group.id} className="relative space-y-1.5 pb-1">
                  <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-primary-700 border-2 border-white ring-4 ring-primary-50" />
                  <div className="text-xs font-bold text-gray-900">
                    {formatCombinedActionTitle(group.action, group.entries)}
                  </div>

                  <div className="space-y-1">
                    {group.entries.map((entry) => (
                      <div
                        key={entry.auditLogId}
                        className="text-[11px] text-gray-600 leading-relaxed break-words"
                      >
                        {group.entries.length > 1 && (
                          <span className="font-semibold text-gray-700 mr-1.5">
                            {humanizeField(entry.fieldName)}:
                          </span>
                        )}
                        <span className="text-gray-400 font-medium">
                          {entry.previousValue ?? "—"}
                        </span>
                        <span className="mx-1 text-gray-400 font-bold">&rarr;</span>
                        <span className="text-gray-900 font-semibold">
                          {entry.newValue ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    className="text-[10px] text-gray-400 font-medium pt-0.5"
                    suppressHydrationWarning
                  >
                    {group.updatedByName ?? "System user"} • {formatStamp(group.updatedAt)}
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

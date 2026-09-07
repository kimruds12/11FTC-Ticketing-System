"use client";

import { useState } from "react";
import {
  TicketStatus,
  encodeTicketSchema,
  type DepartmentDto,
  type MainIssueDto,
} from "@11ftc/shared";
import ModalShell from "@/components/ui/ModalShell";
import AssigneePicker from "./AssigneePicker";
import EmployeePicker from "./EmployeePicker";
import { encodeTicketAction } from "./actions";

/**
 * Encode form (M5, FR-1/2/5). Sends `employeeName` + `departmentId`; the API resolve-or-creates
 * the employee (M4), so picking an existing person and adding a new one are the same request.
 *
 * Two deliberate choices:
 * - **Status defaults to Closed.** The department fixes the problem first and records it after,
 *   so Closed is the common case (see .claude/rules/domain.md).
 * - **Validation uses the shared `encodeTicketSchema`** — the exact schema the API enforces.
 *   No frontend-only rules: a stricter regex here would silently reject valid names.
 *
 * Both halves of a ticket — who reported it, and who handled it — use the SAME picker: the
 * registered directory opens on focus, so the encoder picks a known person instead of quietly
 * creating a near-duplicate. Typing an unregistered name still works, flagged as new, and the
 * API resolve-or-creates it inside the encode transaction — so neither field ever waits on an
 * admin to provision anything (ADR-0017).
 */
interface EncodeTicketFormProps {
  departments: DepartmentDto[];
  mainIssues: MainIssueDto[];
  /** Dismiss without saving. */
  onClose: () => void;
  /** A ticket was created; the queue behind the modal should refresh. */
  onCreated: () => void;
}

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function EncodeTicketForm({
  departments,
  mainIssues,
  onClose,
  onCreated,
}: EncodeTicketFormProps) {
  const [date, setDate] = useState(today());
  const [employeeName, setEmployeeName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [mainIssueId, setMainIssueId] = useState("");
  const [concern, setConcern] = useState("");
  const [status, setStatus] = useState<TicketStatus>(TicketStatus.CLOSED);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lookupsMissing = departments.length === 0 || mainIssues.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Validate with the API's own schema — single source of truth.
    const parsed = encodeTicketSchema.safeParse({
      date,
      employeeName,
      departmentId,
      mainIssueId,
      concern,
      status,
      assignees,
      remarks: remarks.trim() || null,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const res = await encodeTicketAction(parsed.data);
    setSubmitting(false);

    if (res.ok) {
      // No navigation. The encoder stays on the queue they were reading, which is the whole
      // point of the modal — recording a ticket should not cost them their place.
      onCreated();
      onClose();
      return;
    }
    setFormError(res.error);
  }

  const labelCls = "block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5";
  const errCls = "text-[10px] text-red-600 font-bold mt-1.5";

  return (
    <ModalShell
      title="Encode Ticket"
      eyebrow="IT Ticketing Operations"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn-outline font-bold text-xs py-2.5 px-4 text-gray-500 bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="encode-ticket-form"
            disabled={submitting || lookupsMissing}
            className="btn-primary font-bold text-xs py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Encoding..." : "Encode Ticket"}
          </button>
        </>
      }
    >
      {/* The submit button lives in the shell's footer and reaches back via `form=`, so the
          action row stays pinned while the body scrolls. */}
      <form
        id="encode-ticket-form"
        onSubmit={handleSubmit}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 md:px-8"
      >
        {lookupsMissing && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800">
            Departments and main-issue categories must be configured before tickets can be
            encoded. Ask an administrator to add the department&apos;s real lists.
          </div>
        )}

        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
            {formError}
          </div>
        )}

          {/* Date — backdating is supported (FR-5); the ticket number follows this date. */}
          <div>
            <label htmlFor="date" className={labelCls}>
              Date of Concern
            </label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input w-full"
            />
            {errors.date && <p className={errCls}>{errors.date}</p>}
          </div>

          {/* Employee — pick from the registered directory; a new name is possible but
              visibly marked as new (M4 invariant 1: match first, create second). */}
          <div>
            <label htmlFor="employeeName" className={labelCls}>
              Employee Name
            </label>
            <EmployeePicker
              id="employeeName"
              value={employeeName}
              onChange={setEmployeeName}
              // Picking a registered person pins their department, so a ticket cannot be filed
              // against the wrong "Karen" — 16 first names collide in the real directory.
              onSelect={(emp) => setDepartmentId(emp.departmentId)}
              invalid={Boolean(errors.employeeName)}
            />
            {errors.employeeName && <p className={errCls}>{errors.employeeName}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department — M2 lookup, never a hardcoded list (OPEN-4) */}
            <div>
              <label htmlFor="departmentId" className={labelCls}>
                Department
              </label>
              <select
                id="departmentId"
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={`input bg-gray-50 cursor-pointer font-semibold text-sm text-gray-700 w-full ${
                  errors.departmentId ? "border-red-500" : ""
                }`}
              >
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.departmentId && <p className={errCls}>{errors.departmentId}</p>}
            </div>

            {/* Main issue — M2 lookup */}
            <div>
              <label htmlFor="mainIssueId" className={labelCls}>
                Main Issue
              </label>
              <select
                id="mainIssueId"
                required
                value={mainIssueId}
                onChange={(e) => setMainIssueId(e.target.value)}
                className={`input bg-gray-50 cursor-pointer font-semibold text-sm text-gray-700 w-full ${
                  errors.mainIssueId ? "border-red-500" : ""
                }`}
              >
                <option value="">Select issue…</option>
                {mainIssues.map((mi) => (
                  <option key={mi.mainIssueId} value={mi.mainIssueId}>
                    {mi.label}
                  </option>
                ))}
              </select>
              {errors.mainIssueId && <p className={errCls}>{errors.mainIssueId}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="concern" className={labelCls}>
              Concern
            </label>
            <textarea
              id="concern"
              required
              rows={3}
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              placeholder="Describe the issue as reported..."
              className={`input w-full resize-none ${errors.concern ? "border-red-500" : ""}`}
            />
            {errors.concern && <p className={errCls}>{errors.concern}</p>}
          </div>

          {/* Handled by — one field, any number of technicians, create-as-you-type. */}
          <div>
            <label className={labelCls}>Handled By</label>
            <AssigneePicker
              value={assignees}
              onChange={setAssignees}
              hint="Enter to add. A name that isn't in the list yet is created with this ticket."
            />
            {errors.assignees && <p className={errCls}>{errors.assignees}</p>}
          </div>

          {/* Status — Closed by default: work happens before the ticket exists. */}
          <div>
            <label htmlFor="status" className={labelCls}>
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
              className="input bg-gray-50 cursor-pointer font-semibold text-sm text-gray-700 w-full"
            >
              <option value={TicketStatus.CLOSED}>Closed</option>
              <option value={TicketStatus.ONGOING}>Ongoing</option>
              <option value={TicketStatus.OPEN}>Open</option>
            </select>
            <p className="text-[10px] text-gray-400 font-medium mt-1">
              Closed is terminal — it cannot be reopened.
            </p>
          </div>

          <div>
            <label htmlFor="remarks" className={labelCls}>
              Remarks
            </label>
            <input
              id="remarks"
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional — e.g. scheduled after work hours"
              className="input w-full text-sm"
            />
            {errors.remarks && <p className={errCls}>{errors.remarks}</p>}
          </div>

      </form>
    </ModalShell>
  );
}

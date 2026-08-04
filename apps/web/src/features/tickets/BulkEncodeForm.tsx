"use client";

import { useState } from "react";
import {
  TicketStatus,
  bulkEncodeTicketSchema,
  type DepartmentDto,
  type MainIssueDto,
} from "@11ftc/shared";
import ModalShell from "@/components/ui/ModalShell";
import AssigneePicker from "./AssigneePicker";
import EmployeePicker from "./EmployeePicker";
import { bulkEncodeTicketAction } from "./actions";

/**
 * Bulk encode (FR-39). The department's stated reason for having this system is to make
 * recording finished work cost less, and the shape of the form is the whole feature.
 *
 * A shift's worth of tickets share almost everything: the same day, the same one or two
 * technicians, and Closed — because the work was already done. What actually differs is who
 * reported it and what was wrong. So the shared fields are lifted OUT of the rows and stated
 * once, and a row carries only what varies. Repeating a date picker and a technician picker
 * on every line would be a table of mostly-identical cells, which is the manual copying this
 * is meant to replace.
 *
 * The batch is atomic (see `bulkEncodeTicketSchema`): one bad row writes nothing. Errors are
 * therefore reported per row, in place, so the fix is obvious before resubmitting.
 */
interface BulkEncodeFormProps {
  departments: DepartmentDto[];
  mainIssues: MainIssueDto[];
  onClose: () => void;
  onCreated: (count: number) => void;
}

interface DraftRow {
  key: string;
  employeeName: string;
  departmentId: string;
  mainIssueId: string;
  concern: string;
}

const MAX_ROWS = 25; // mirrors bulkEncodeTicketSchema

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

let seq = 0;
const emptyRow = (): DraftRow => ({
  key: `r${++seq}`,
  employeeName: "",
  departmentId: "",
  mainIssueId: "",
  concern: "",
});

export default function BulkEncodeForm({
  departments,
  mainIssues,
  onClose,
  onCreated,
}: BulkEncodeFormProps) {
  // Shared across every row in the batch.
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<TicketStatus>(TicketStatus.CLOSED);
  const [assignees, setAssignees] = useState<string[]>([]);

  const [rows, setRows] = useState<DraftRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [rowErrors, setRowErrors] = useState<Record<number, Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lookupsMissing = departments.length === 0 || mainIssues.length === 0;

  /** A row the encoder started but did not finish is dropped, not rejected. */
  const isBlank = (r: DraftRow) =>
    !r.employeeName.trim() && !r.concern.trim() && !r.departmentId && !r.mainIssueId;
  const filled = rows.filter((r) => !isBlank(r));

  function patchRow(key: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, emptyRow()]));
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((r) => r.key !== key)));
  }

  /** Repeat the previous row's person and department — the common case is several concerns
      from one employee in a single visit. Saves retyping the part that does not change. */
  function duplicateRow(key: string) {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.key === key);
      const src = prev[i];
      if (i < 0 || !src || prev.length >= MAX_ROWS) return prev;
      const copy: DraftRow = {
        ...emptyRow(),
        employeeName: src.employeeName,
        departmentId: src.departmentId,
      };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (filled.length === 0) {
      setFormError("Add at least one ticket before encoding.");
      return;
    }

    const payload = {
      tickets: filled.map((r) => ({
        date,
        employeeName: r.employeeName,
        departmentId: r.departmentId,
        mainIssueId: r.mainIssueId,
        concern: r.concern,
        status,
        assignees,
        remarks: null,
      })),
    };

    // Validate with the API's own schema — the same object the server will re-check.
    const parsed = bulkEncodeTicketSchema.safeParse(payload);
    if (!parsed.success) {
      const byRow: Record<number, Record<string, string>> = {};
      for (const issue of parsed.error.issues) {
        // path is ["tickets", <index>, <field>]
        const index = typeof issue.path[1] === "number" ? issue.path[1] : -1;
        const field = String(issue.path[2] ?? "form");
        if (index < 0) continue;
        byRow[index] ??= {};
        byRow[index][field] ??= issue.message;
      }
      setRowErrors(byRow);
      setFormError("Some rows are incomplete. Fix the highlighted fields and try again.");
      return;
    }

    setRowErrors({});
    setSubmitting(true);
    const res = await bulkEncodeTicketAction(parsed.data);
    setSubmitting(false);

    if (res.ok) {
      onCreated(res.data.length);
      onClose();
      return;
    }
    // The batch is atomic, so a server rejection means NOTHING was written. Say so — otherwise
    // the encoder's next move is to check the list and re-enter whatever they think is missing.
    setFormError(`${res.error} — no tickets were created.`);
  }

  const labelCls = "block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5";
  const errCls = "text-[10px] text-red-600 font-bold mt-1";
  const err = (i: number, f: string) => rowErrors[i]?.[f];

  return (
    <ModalShell
      title="Bulk Encode"
      eyebrow={`${filled.length} ticket${filled.length === 1 ? "" : "s"} ready`}
      onClose={onClose}
      width="max-w-5xl"
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
            form="bulk-encode-form"
            disabled={submitting || lookupsMissing || filled.length === 0}
            className="btn-primary font-bold text-xs py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting
              ? `Encoding ${filled.length}…`
              : `Encode ${filled.length} Ticket${filled.length === 1 ? "" : "s"}`}
          </button>
        </>
      }
    >
      <form
        id="bulk-encode-form"
        onSubmit={handleSubmit}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 md:px-8"
      >
        {lookupsMissing && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800">
            Departments and main-issue categories must be configured before tickets can be
            encoded. Ask an administrator to add the department&apos;s real lists.
          </div>
        )}

        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
            {formError}
          </div>
        )}

        {/* ── Shared across the batch ─────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Applies to every ticket below
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="bulk-date" className={labelCls}>
                Date of Concern
              </label>
              <input
                id="bulk-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input w-full bg-white"
              />
            </div>
            <div>
              <label htmlFor="bulk-status" className={labelCls}>
                Status
              </label>
              <select
                id="bulk-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                className="input w-full cursor-pointer bg-white font-semibold text-sm text-gray-700"
              >
                <option value={TicketStatus.CLOSED}>Closed</option>
                <option value={TicketStatus.ONGOING}>Ongoing</option>
                <option value={TicketStatus.OPEN}>Open</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Handled By</label>
              <AssigneePicker
                value={assignees}
                onChange={setAssignees}
                hint="Applied to every ticket in this batch."
              />
            </div>
          </div>
        </div>

        {/* ── One row per ticket ──────────────────────────────────────
            Stacks on a phone, columns from `lg`. The encode path has to work one-handed at a
            machine (PRODUCT.md), so the row never becomes a horizontally-scrolled grid. */}
        <div className="space-y-3">
          {rows.map((row, i) => {
            const blank = isBlank(row);
            const index = filled.indexOf(row); // error indices refer to the FILLED array
            return (
              <div
                key={row.key}
                className={`rounded-xl border p-3 transition-colors ${
                  index >= 0 && rowErrors[index]
                    ? "border-red-200 bg-red-50/40"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-2.5 w-5 shrink-0 text-center text-xs font-bold tabular-nums text-gray-300">
                    {i + 1}
                  </span>

                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
                    <div className="lg:col-span-3">
                      <label className={labelCls}>Employee</label>
                      <EmployeePicker
                        id={`bulk-emp-${row.key}`}
                        value={row.employeeName}
                        onChange={(v) => patchRow(row.key, { employeeName: v })}
                        onSelect={(emp) => patchRow(row.key, { departmentId: emp.departmentId })}
                        invalid={Boolean(index >= 0 && err(index, "employeeName"))}
                      />
                      {index >= 0 && err(index, "employeeName") && (
                        <p className={errCls}>{err(index, "employeeName")}</p>
                      )}
                    </div>

                    <div className="lg:col-span-2">
                      <label className={labelCls}>Department</label>
                      <select
                        value={row.departmentId}
                        onChange={(e) => patchRow(row.key, { departmentId: e.target.value })}
                        className={`input w-full cursor-pointer bg-gray-50 text-sm font-semibold text-gray-700 ${
                          index >= 0 && err(index, "departmentId") ? "border-red-500" : ""
                        }`}
                      >
                        <option value="">Select…</option>
                        {departments.map((d) => (
                          <option key={d.departmentId} value={d.departmentId}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      {index >= 0 && err(index, "departmentId") && (
                        <p className={errCls}>Required</p>
                      )}
                    </div>

                    <div className="lg:col-span-2">
                      <label className={labelCls}>Main Issue</label>
                      <select
                        value={row.mainIssueId}
                        onChange={(e) => patchRow(row.key, { mainIssueId: e.target.value })}
                        className={`input w-full cursor-pointer bg-gray-50 text-sm font-semibold text-gray-700 ${
                          index >= 0 && err(index, "mainIssueId") ? "border-red-500" : ""
                        }`}
                      >
                        <option value="">Select…</option>
                        {mainIssues.map((mi) => (
                          <option key={mi.mainIssueId} value={mi.mainIssueId}>
                            {mi.label}
                          </option>
                        ))}
                      </select>
                      {index >= 0 && err(index, "mainIssueId") && (
                        <p className={errCls}>Required</p>
                      )}
                    </div>

                    <div className="lg:col-span-5">
                      <label className={labelCls}>Concern</label>
                      <input
                        type="text"
                        value={row.concern}
                        onChange={(e) => patchRow(row.key, { concern: e.target.value })}
                        placeholder="What was reported…"
                        className={`input w-full text-sm ${
                          index >= 0 && err(index, "concern") ? "border-red-500" : ""
                        }`}
                      />
                      {index >= 0 && err(index, "concern") && (
                        <p className={errCls}>{err(index, "concern")}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1 pt-6">
                    <button
                      type="button"
                      onClick={() => duplicateRow(row.key)}
                      disabled={blank || rows.length >= MAX_ROWS}
                      title="Add another concern for this employee"
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2v-2" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      title="Remove row"
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={addRow}
            disabled={rows.length >= MAX_ROWS}
            className="btn-outline py-2 px-3.5 text-xs font-bold text-gray-600 disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add row
          </button>
          <p className="text-[10px] font-medium text-gray-400">
            {rows.length >= MAX_ROWS
              ? `Maximum ${MAX_ROWS} tickets per batch.`
              : "Empty rows are ignored. The whole batch saves together — if one row is rejected, nothing is written."}
          </p>
        </div>
      </form>
    </ModalShell>
  );
}

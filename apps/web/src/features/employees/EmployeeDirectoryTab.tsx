"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DepartmentDto, EmployeeDto } from "@11ftc/shared";
import { createEmployeeAction, updateEmployeeAction } from "./actions";

/**
 * The EMPLOYEE directory — the people who REPORT concerns (ADR-0013). Not accounts.
 *
 * This is the register-them-up-front half of the same job the encode form does inline: an
 * admin can add people ahead of time, and the encoder can still introduce someone new mid
 * ticket. Both paths run the same `normalizeName` + unique-index dedup server-side, so they
 * cannot produce two "Juan Dela Cruz" rows between them.
 *
 * There is no delete. Retiring sets `is_active = false` (FR-9), and retired people stay
 * listed so their historical tickets still make sense.
 */
interface EmployeeDirectoryTabProps {
  employees: EmployeeDto[];
  departments: DepartmentDto[];
  search: string;
}

export default function EmployeeDirectoryTab({
  employees,
  departments,
  search,
}: EmployeeDirectoryTabProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.departmentName ?? "").toLowerCase().includes(q),
    );
  }, [employees, search]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Something went wrong");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleAdd() {
    if (!name.trim() || !departmentId) {
      setError("A name and a department are both required.");
      return;
    }
    const ok = await run(() =>
      createEmployeeAction({ name: name.trim(), departmentId }),
    );
    if (ok) {
      setName("");
      setDepartmentId("");
      setAdding(false);
    }
  }

  async function handleSaveEdit(employeeId: string) {
    const ok = await run(() =>
      updateEmployeeAction(employeeId, {
        name: editName.trim(),
        departmentId: editDept,
      }),
    );
    if (ok) setEditingId(null);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400 font-medium">
          {filtered.length} of {employees.length}{" "}
          {employees.length === 1 ? "employee" : "employees"} · people who report concerns
        </p>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary text-xs py-2 px-3.5">
            Add Employee
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
              className="input w-full text-sm"
            />
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="input w-full text-sm bg-white cursor-pointer"
            >
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleAdd()}
              disabled={busy}
              className="btn-primary text-xs py-2 px-4 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th>Name</Th>
                <Th>Department</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-xs text-gray-400 font-medium">
                    {search ? "No employees match that search." : "No employees yet."}
                  </td>
                </tr>
              )}
              {filtered.map((e) => {
                const editing = editingId === e.employeeId;
                return (
                  <tr key={e.employeeId} className={e.isActive ? "" : "bg-gray-50/60"}>
                    <td className="px-5 py-3 text-sm">
                      {editing ? (
                        <input
                          value={editName}
                          onChange={(ev) => setEditName(ev.target.value)}
                          className="input text-sm w-full"
                        />
                      ) : (
                        <span className="font-semibold text-gray-900">{e.name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {editing ? (
                        <select
                          value={editDept}
                          onChange={(ev) => setEditDept(ev.target.value)}
                          className="input text-sm w-full bg-white cursor-pointer"
                        >
                          {departments.map((d) => (
                            <option key={d.departmentId} value={d.departmentId}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-600 font-medium text-xs">
                          {e.departmentName ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                          e.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {e.isActive ? "Active" : "Retired"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm whitespace-nowrap">
                      {editing ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => void handleSaveEdit(e.employeeId)}
                            disabled={busy}
                            className="text-xs font-bold text-primary-700 hover:underline disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingId(e.employeeId);
                              setEditName(e.name);
                              setEditDept(e.departmentId);
                              setError(null);
                            }}
                            className="text-xs font-bold text-primary-700 hover:underline"
                          >
                            Edit
                          </button>
                          {/* Retire, never delete — their tickets still reference them. */}
                          <button
                            onClick={() =>
                              void run(() =>
                                updateEmployeeAction(e.employeeId, { isActive: !e.isActive }),
                              )
                            }
                            disabled={busy}
                            className="text-xs font-bold text-gray-400 hover:text-gray-700 disabled:opacity-60"
                          >
                            {e.isActive ? "Retire" : "Restore"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
      {children}
    </th>
  );
}

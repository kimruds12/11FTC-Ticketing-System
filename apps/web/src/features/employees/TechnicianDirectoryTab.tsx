"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TechnicianDto, UserDto } from "@11ftc/shared";
import { createTechnicianAction, updateTechnicianAction } from "./actions";

/**
 * The TECHNICIAN directory — the IT people who HANDLE tickets (ADR-0017).
 *
 * A technician is NOT an account, and that is the point: "Patrick" handled 104 tickets and
 * has never signed in. Requiring a login just to record who fixed something is what made
 * assignment awkward before. Linking an account is optional and only powers "my tickets".
 *
 * Same as employees, this register-up-front view and the encode form's inline create are two
 * doors onto one deduped list. No delete — retire with `is_active` (FR-9).
 */
interface TechnicianDirectoryTabProps {
  technicians: TechnicianDto[];
  /** Accounts available to link. Empty for IT Staff — /users is admin-only; linking is optional. */
  users: UserDto[];
  search: string;
}

export default function TechnicianDirectoryTab({
  technicians,
  users,
  search,
}: TechnicianDirectoryTabProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUserId, setEditUserId] = useState("");

  const userName = useMemo(
    () => new Map(users.map((u) => [u.userId, u.fullName] as const)),
    [users],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return technicians;
    return technicians.filter((t) => t.name.toLowerCase().includes(q));
  }, [technicians, search]);

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
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    const ok = await run(() =>
      createTechnicianAction({ name: name.trim(), userId: userId || null }),
    );
    if (ok) {
      setName("");
      setUserId("");
      setAdding(false);
    }
  }

  async function handleSaveEdit(technicianId: string) {
    const ok = await run(() =>
      updateTechnicianAction(technicianId, {
        name: editName.trim(),
        userId: editUserId || null,
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
          {filtered.length} of {technicians.length}{" "}
          {technicians.length === 1 ? "technician" : "technicians"} · no sign-in account needed
        </p>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary text-xs py-2 px-3.5">
            Add Technician
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
              placeholder="Name as it appears on the sheet — e.g. Patrick"
              autoFocus
              className="input w-full text-sm"
            />
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={users.length === 0}
              className="input w-full text-sm bg-white cursor-pointer disabled:opacity-60"
            >
              <option value="">No linked account (optional)</option>
              {users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-gray-400 font-medium">
            The name is what appears in the sheet&apos;s &ldquo;Assigned to&rdquo; column, so use
            the short form the team already writes.
          </p>
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
                <Th>Technician</Th>
                <Th>Linked Account</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-xs text-gray-400 font-medium">
                    {search ? "No technicians match that search." : "No technicians yet."}
                  </td>
                </tr>
              )}
              {filtered.map((t) => {
                const editing = editingId === t.technicianId;
                return (
                  <tr key={t.technicianId} className={t.isActive ? "" : "bg-gray-50/60"}>
                    <td className="px-5 py-3 text-sm">
                      {editing ? (
                        <input
                          value={editName}
                          onChange={(ev) => setEditName(ev.target.value)}
                          className="input text-sm w-full"
                        />
                      ) : (
                        <span className="flex items-center gap-2 font-semibold text-gray-900">
                          <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 font-bold text-[10px] flex items-center justify-center border border-teal-100">
                            {initials(t.name)}
                          </span>
                          {t.name}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {editing ? (
                        <select
                          value={editUserId}
                          onChange={(ev) => setEditUserId(ev.target.value)}
                          disabled={users.length === 0}
                          className="input text-sm w-full bg-white cursor-pointer disabled:opacity-60"
                        >
                          <option value="">No linked account</option>
                          {users.map((u) => (
                            <option key={u.userId} value={u.userId}>
                              {u.fullName}
                            </option>
                          ))}
                        </select>
                      ) : t.userId ? (
                        <span className="text-gray-600 font-medium text-xs">
                          {userName.get(t.userId) ?? "Linked"}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic font-medium text-xs">
                          None — not required
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                          t.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {t.isActive ? "Active" : "Retired"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm whitespace-nowrap">
                      {editing ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => void handleSaveEdit(t.technicianId)}
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
                              setEditingId(t.technicianId);
                              setEditName(t.name);
                              setEditUserId(t.userId ?? "");
                              setError(null);
                            }}
                            className="text-xs font-bold text-primary-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              void run(() =>
                                updateTechnicianAction(t.technicianId, {
                                  isActive: !t.isActive,
                                }),
                              )
                            }
                            disabled={busy}
                            className="text-xs font-bold text-gray-400 hover:text-gray-700 disabled:opacity-60"
                          >
                            {t.isActive ? "Retire" : "Restore"}
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
      {children}
    </th>
  );
}

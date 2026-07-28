"use client";

import { useState } from "react";
import { UserRole } from "@11ftc/shared";
import { inviteUserAction } from "./actions";

/**
 * Invite (pre-authorize) a System User. Submitting adds the email to the allowlist; the
 * person gains access on their first "Sign in with Google" (ADR-0013). No password is set.
 */
export default function InviteUserModal({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.IT_STAFF);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await inviteUserAction({ email: email.trim(), fullName: fullName.trim(), role });
    setSubmitting(false);
    if (res.ok) {
      setEmail("");
      setFullName("");
      setRole(UserRole.IT_STAFF);
      onInvited();
    } else {
      setError(res.error);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-extrabold text-gray-900">Invite user</h2>
        <p className="mt-1 text-sm text-gray-400 font-medium">
          Pre-authorize a Gmail. They gain access on first sign-in with Google — no password.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Email (Gmail)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gmail.com"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Full name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Dela Cruz"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="input w-full"
            >
              <option value={UserRole.IT_STAFF}>IT Staff</option>
              <option value={UserRole.IT_ADMINISTRATOR}>IT Administrator</option>
            </select>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline px-4 py-2 text-sm font-bold"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-sm font-bold shadow-sm"
              disabled={submitting}
            >
              {submitting ? "Inviting…" : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

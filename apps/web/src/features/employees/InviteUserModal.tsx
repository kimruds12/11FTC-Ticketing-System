"use client";

import { useState } from "react";
import { UserRole } from "@11ftc/shared";
import type { InvitedUserDto } from "@11ftc/shared";
import { inviteUserAction } from "./actions";

/**
 * Create a System User — the allowlist row AND the sign-in account (ADR-0018).
 *
 * On success the modal switches to showing the generated password. That is not a nicety: the
 * internal deployment has no mail server, so nothing can be emailed, and the password is not
 * stored anywhere and cannot be read back. If this screen does not show it, the only recovery
 * is an admin reset. The dialog therefore refuses to close on a stray backdrop click once a
 * password is on screen.
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
  const [created, setCreated] = useState<InvitedUserDto | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  function finish() {
    setCreated(null);
    setCopied(false);
    setEmail("");
    setFullName("");
    setRole(UserRole.IT_STAFF);
    onInvited();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await inviteUserAction({ email: email.trim(), fullName: fullName.trim(), role });
    setSubmitting(false);
    if (res.ok) {
      // Do NOT close yet — the password is displayed next, and closing would lose it.
      setCreated(res.data);
    } else {
      setError(res.error);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={created ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {created ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Account created</h2>
              <p className="mt-1 text-sm font-medium text-gray-400">
                {created.fullName} can now sign in as {created.email}.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                Temporary password — shown once
              </p>
              <p className="mt-2 select-all font-mono text-lg font-bold tracking-wide text-amber-950">
                {created.temporaryPassword}
              </p>
              <p className="mt-2 text-[11px] font-medium leading-relaxed text-amber-800">
                It is not stored and cannot be shown again. Give it to them now; they should
                change it from Account after signing in. If it is lost, reset the password.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(created.temporaryPassword ?? "");
                  setCopied(true);
                }}
                className="btn-outline px-4 py-2 text-sm font-bold"
              >
                {copied ? "Copied" : "Copy password"}
              </button>
              <button
                type="button"
                onClick={finish}
                className="btn-primary px-4 py-2 text-sm font-bold shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
        <>
        <h2 className="text-xl font-extrabold text-gray-900">Create user</h2>
        <p className="mt-1 text-sm text-gray-400 font-medium">
          Creates the account and a temporary password, shown once on the next screen.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@11ftc.local"
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
              {submitting ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}

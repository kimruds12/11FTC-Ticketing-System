"use client";

import { useState } from "react";
import { PASSWORD_MIN_LENGTH, changePasswordSchema } from "@11ftc/shared";
import { changePasswordAction } from "../actions";

/**
 * Self-service password change (ADR-0018).
 *
 * Every account starts on a password an administrator generated and read out, so this is the
 * first thing a new user should do. It is not an admin screen — it acts on the caller's own
 * account, taken from the verified session on the server, never from anything this form
 * sends.
 *
 * The current password is required. Without it, an unlocked unattended browser would be
 * enough to take the account over silently.
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    // Confirmation is checked HERE, not in the shared schema: it is a typing safeguard for
    // this form, not a rule the API can enforce — the server never receives the second copy.
    if (newPassword !== confirm) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("The new password must be different from the current one.");
      return;
    }

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the values and try again.");
      return;
    }

    setSubmitting(true);
    const res = await changePasswordAction(parsed.data);
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setDone(true);
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-md space-y-4 p-6" noValidate>
      <div>
        <h2 className="text-lg font-bold text-gray-900">Change password</h2>
        <p className="mt-0.5 text-xs font-medium text-gray-400">
          At least {PASSWORD_MIN_LENGTH} characters. There is no email reset on this network —
          if you forget it, an administrator has to set a new one.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700"
        >
          {error}
        </p>
      )}
      {done && (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs font-semibold text-green-800"
        >
          Password changed. Use it the next time you sign in.
        </p>
      )}

      <Field label="Current password" htmlFor="current">
        <input
          id="current"
          type={show ? "text" : "password"}
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={submitting}
          className="input"
        />
      </Field>

      <Field label="New password" htmlFor="next">
        <input
          id="next"
          type={show ? "text" : "password"}
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={submitting}
          className="input"
        />
      </Field>

      <Field label="Confirm new password" htmlFor="confirm">
        <input
          id="confirm"
          type={show ? "text" : "password"}
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={submitting}
          className="input"
        />
      </Field>

      <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
          className="h-3.5 w-3.5 accent-primary-700"
        />
        Show passwords
      </label>

      <button
        type="submit"
        disabled={submitting || !currentPassword || !newPassword || !confirm}
        className="btn-primary w-full justify-center py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

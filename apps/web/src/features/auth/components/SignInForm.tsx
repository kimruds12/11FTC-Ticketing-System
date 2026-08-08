"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Email + password sign-in (ADR-0018, superseding ADR-0013's Google OAuth).
 *
 * The deployment target is a self-hosted Supabase on the company's internal network with no
 * purchased domain. Google's OAuth console rejects redirect URIs on private IPs and
 * non-public TLDs, so OAuth could not work there at all — passwords are not a downgrade of
 * choice, they are the only option that functions off the public internet.
 *
 * There is no self-registration and no "forgot password?" link, both deliberately: accounts
 * are provisioned by an administrator (`POST /users/invite`), and with no SMTP on an isolated
 * network a reset email could never arrive. A forgotten password is an admin reset.
 *
 * `signInWithPassword` sets the session cookies directly — no PKCE round trip, which is why
 * the old `/auth/callback` route is gone.
 */
export function SignInForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    /**
     * Raced against a timeout, because this call CAN hang indefinitely.
     *
     * supabase-js serialises auth work behind a Web Lock. If an earlier token refresh died
     * holding that lock — which is what happens when the auth server becomes unreachable
     * mid-session — every later sign-in waits on it forever, with no error and no rejection.
     * Without this the button just sits on "Signing in…" and the user has nothing to act on.
     */
    const TIMEOUT_MS = 15_000;
    const result = await Promise.race([
      getBrowserSupabase().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      }),
      new Promise<"timeout">((r) => setTimeout(() => r("timeout"), TIMEOUT_MS)),
    ]);

    if (result === "timeout") {
      setSubmitting(false);
      setError(
        "Sign-in timed out. This usually means stale sign-in data in this browser — " +
          "clear cookies and site data for this site, or try a private window, then retry.",
      );
      return;
    }

    const { error: signInError } = result;

    if (signInError) {
      setSubmitting(false);
      // Credential failures are deliberately vague: distinguishing "no such account" from
      // "wrong password" tells an outsider which addresses are real, and GoTrue's own wording
      // leaks it.
      //
      // ANY OTHER answered request shows the server's message. Collapsing those into "could
      // not reach the sign-in service" is what hid `422 email_provider_disabled` behind a
      // network story and sent debugging in the wrong direction for an hour. Only a request
      // that never got a response — no status at all — is a connectivity problem.
      const status = signInError.status;
      setError(
        status === 400 || status === 401
          ? "Incorrect email or password."
          : status
            ? `Sign-in failed: ${signInError.message}`
            : "Could not reach the sign-in service. Check your connection and try again.",
      );
      return;
    }

    // `refresh()` re-runs the server layout so the (app) shell picks up the new session
    // cookies; without it the push can land on a shell still rendered as signed-out.
    router.push(next);
    router.refresh();
  }

  const field =
    "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white " +
    "placeholder-white/40 outline-none transition-colors focus:border-white/40 focus:bg-white/15 " +
    "disabled:opacity-60";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-100"
        >
          {error}
        </p>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/50"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          placeholder="you@11ftc.local"
          className={field}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/50"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            // Toggleable: the first password anyone types here is a generated one read off a
            // note, and a masked field makes a mistyped character impossible to find.
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className={`${field} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-4 text-[10px] font-bold uppercase tracking-wider text-white/50 transition-colors hover:text-white/80"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !email || !password}
        className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Signing in…" : "Sign In"}
      </button>

      <p className="mt-1 text-center text-[11px] leading-relaxed text-white/40">
        Accounts are created by an IT administrator. If you have forgotten your password, ask
        them to reset it.
      </p>
    </form>
  );
}

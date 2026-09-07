"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useAppStore } from "@/store/hooks";
import { setSession } from "@/store/slices/authSlice";
import type { MeResponse } from "@11ftc/shared";

/**
 * Seeds the client-side `authSlice` from the server-fetched AuthContext (the hybrid pattern:
 * server owns the read, Redux holds only the client mirror for cosmetic RBAC — ADR-0011).
 * Rendered by the `(app)` shell, which has already verified the session server-side.
 */
export function AuthHydrator({
  initial,
  children,
}: {
  initial: MeResponse;
  children: ReactNode;
}) {
  const store = useAppStore();

  /**
   * Seed during the FIRST RENDER, not in an effect.
   *
   * Effects do not run during SSR. Seeding in one meant the server rendered the *unseeded*
   * store — so an administrator's server HTML showed the IT Staff shell, and the admin nav
   * and dashboard only appeared after hydration. The `useState` initializer runs once on
   * both sides, before children render, so the server emits the correct shell and the client
   * hydrates against identical markup.
   *
   * Dispatching here is safe: no child has subscribed yet on this pass, so there is no
   * component to update mid-render. `setSession` is idempotent, which also makes StrictMode's
   * double-invocation a no-op.
   */
  useState(() => {
    store.dispatch(
      setSession({
        userId: initial.userId,
        role: initial.role,
        fullName: initial.fullName,
        email: initial.email,
      }),
    );
  });

  // Keeps the mirror honest if the shell ever hands down a different session (a re-auth, or
  // a future soft navigation that re-runs the server layout). Guarded so the common case —
  // the same session already seeded above — dispatches nothing.
  useEffect(() => {
    const current = store.getState().auth;
    if (current.userId === initial.userId && current.role === initial.role) return;
    store.dispatch(
      setSession({
        userId: initial.userId,
        role: initial.role,
        fullName: initial.fullName,
        email: initial.email,
      }),
    );
  }, [store, initial]);

  return <>{children}</>;
}

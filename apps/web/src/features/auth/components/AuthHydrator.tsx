"use client";
import { useEffect, type ReactNode } from "react";
import { useAppDispatch } from "@/store/hooks";
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
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      setSession({
        userId: initial.userId,
        role: initial.role,
        fullName: initial.fullName,
      }),
    );
  }, [dispatch, initial]);

  return <>{children}</>;
}

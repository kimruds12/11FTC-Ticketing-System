import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { UserRole } from "@11ftc/shared";

/**
 * CLIENT auth state — a mirror of the server session, seeded once by the app shell from
 * `GET /me` (M1). Drives cosmetic RBAC (hiding admin nav). It is NEVER the security
 * boundary — the API's RolesGuard is (architecture.md).
 */
export interface AuthState {
  userId: string | null;
  role: UserRole | null;
  fullName: string | null;
  status: "unknown" | "authenticated" | "unauthenticated";
}

/**
 * Empty, and IDENTICAL on the server and the client.
 *
 * This used to branch on `typeof window` and read a role out of localStorage, falling back
 * to a hardcoded `usr-admin` / "Admin User" / `authenticated` session. Two failures came out
 * of that, and the hydration warning was only the loud one:
 *
 *  1. The server has no `window`, so it always rendered the hardcoded ADMIN. The client read
 *     localStorage and rendered the real role. Server and client disagreed on every render
 *     for a non-admin — which is exactly the "server/client branch" case React names first
 *     in that error.
 *  2. The fallback invented a signed-in administrator that no one had authenticated as.
 *     `AdminDashboard` and the admin-only Directory link were server-rendered for IT Staff
 *     before the real session arrived, and the header showed a fabricated name. Cosmetic
 *     rather than a hole — the API's RolesGuard is the boundary (ADR-0011) — but it showed
 *     people a privilege level they do not hold, from data the system never held.
 *
 * The session's only source is the server: the `(app)` shell verifies it and hands it to
 * `AuthHydrator`. localStorage is not a session store, and a default is not a session.
 */
const initialState: AuthState = {
  userId: null,
  role: null,
  fullName: null,
  status: "unknown",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(
      state,
      action: PayloadAction<{ userId: string; role: UserRole; fullName: string }>,
    ) {
      state.userId = action.payload.userId;
      state.role = action.payload.role;
      state.fullName = action.payload.fullName;
      state.status = "authenticated";
    },
    clearSession(state) {
      state.userId = null;
      state.role = null;
      state.fullName = null;
      state.status = "unauthenticated";
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export const authReducer = authSlice.reducer;


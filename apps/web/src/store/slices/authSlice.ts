import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UserRole } from "@11ftc/shared";

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

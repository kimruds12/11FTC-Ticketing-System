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

const getInitialState = (): AuthState => {
  if (typeof window !== "undefined") {
    const savedRole = localStorage.getItem("ftrace-user-role");
    if (savedRole === UserRole.IT_ADMINISTRATOR || savedRole === UserRole.IT_STAFF) {
      return {
        userId: savedRole === UserRole.IT_ADMINISTRATOR ? "usr-admin" : "usr-staff",
        role: savedRole as UserRole,
        fullName: savedRole === UserRole.IT_ADMINISTRATOR ? "Admin User" : "IT Staff",
        status: "authenticated",
      };
    }
  }
  return {
    userId: "usr-admin",
    role: UserRole.IT_ADMINISTRATOR,
    fullName: "Admin User",
    status: "authenticated",
  };
};

const authSlice = createSlice({
  name: "auth",
  initialState: getInitialState(),
  reducers: {
    setSession(
      state,
      action: PayloadAction<{ userId: string; role: UserRole; fullName: string }>,
    ) {
      state.userId = action.payload.userId;
      state.role = action.payload.role;
      state.fullName = action.payload.fullName;
      state.status = "authenticated";
      if (typeof window !== "undefined") {
        localStorage.setItem("ftrace-user-role", action.payload.role);
      }
    },
    clearSession(state) {
      state.userId = null;
      state.role = null;
      state.fullName = null;
      state.status = "unauthenticated";
      if (typeof window !== "undefined") {
        localStorage.removeItem("ftrace-user-role");
      }
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export const authReducer = authSlice.reducer;


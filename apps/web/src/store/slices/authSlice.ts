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
  /** The signed-in address. Mirrored so the header shows the REAL one — it used to render a
   *  hardcoded `admin@gmail.com`/`staff@gmail.com`, which is invented data shown as fact. */
  email: string | null;
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
        email: null,
        status: "authenticated",
      };
    }
  }
  return {
    userId: null,
    role: null,
    fullName: null,
    email: null,
    status: "unauthenticated",
  };
};

const initialState: AuthState = getInitialState();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(
      state,
      action: PayloadAction<{
        userId: string;
        role: UserRole;
        fullName: string;
        email: string;
      }>,
    ) {
      state.userId = action.payload.userId;
      state.role = action.payload.role;
      state.fullName = action.payload.fullName;
      state.email = action.payload.email;
      state.status = "authenticated";
    },
    clearSession(state) {
      state.userId = null;
      state.role = null;
      state.fullName = null;
      state.email = null;
      state.status = "unauthenticated";
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export const authReducer = authSlice.reducer;


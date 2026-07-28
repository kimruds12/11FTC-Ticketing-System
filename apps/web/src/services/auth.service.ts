import type { AxiosInstance } from "axios";
import type { MeResponse } from "@11ftc/shared";

/**
 * Auth transport (M1). `GET /me` returns the caller's verified AuthContext — the API's
 * AuthGuard authorizes against the `public.users` allowlist, so a signed-in-but-not-invited
 * Google user gets a 403 here (surfaced by the app shell as "not authorized").
 */
export const authService = (api: AxiosInstance) => ({
  async me(): Promise<MeResponse> {
    const { data } = await api.get<MeResponse>("/me");
    return data;
  },
});

export type AuthService = ReturnType<typeof authService>;

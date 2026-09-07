import { z } from "zod";
import { UserRole } from "../enums.js";

/**
 * M1 — Auth contract. The shape the API attaches to every authenticated request and
 * returns from `GET /me`. Source of truth for both apps: the backend builds it in
 * `AuthGuard`; the web app reads it to seed its client-side auth state (cosmetic RBAC).
 *
 * This is a RESPONSE/context contract only. There is no login DTO here: sign-in is email +
 * password handled by Supabase Auth in the browser (ADR-0018), so the API never receives
 * credentials. The one exception is `POST /me/password`, which needs the current password to
 * authorize a change — see `changePasswordSchema` in master-data.dto.
 */
export const authContextSchema = z.object({
  /** `public.users.user_id` — OUR user PK, not the Supabase auth UID. */
  userId: z.string().uuid(),
  role: z.enum([UserRole.IT_ADMINISTRATOR, UserRole.IT_STAFF]),
  fullName: z.string().min(1),
  email: z.string().email(),
});

/** The verified identity carried on each request and returned by `GET /me`. */
export type AuthContext = z.infer<typeof authContextSchema>;

/** `GET /me` response — the caller's own AuthContext. */
export const meResponseSchema = authContextSchema;
export type MeResponse = z.infer<typeof meResponseSchema>;

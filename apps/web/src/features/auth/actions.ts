"use server";
import { serverApi } from "@/services/server";
import { AppError } from "@/services/errors";
import type { ChangePasswordDto } from "@11ftc/shared";

/**
 * Auth Server Actions. Passwords go through the SERVER, never straight from the browser to
 * the auth server: our API is the only place that can require the current password and check
 * it against the account named by the verified session rather than by the request.
 *
 * Nothing here logs or returns a password.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function changePasswordAction(
  payload: ChangePasswordDto,
): Promise<ActionResult> {
  try {
    await serverApi().post("/me/password", payload);
    return { ok: true };
  } catch (error) {
    if (error instanceof AppError) {
      // 401 here means the CURRENT password was wrong — not that the session expired — so it
      // must not be reported as "please sign in again", which would be a dead end.
      return {
        ok: false,
        error: error.status === 401 ? "Current password is incorrect." : error.message,
      };
    }
    return { ok: false, error: "Could not reach the server. Try again." };
  }
}

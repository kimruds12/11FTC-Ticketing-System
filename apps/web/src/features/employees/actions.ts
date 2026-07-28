"use server";
import { revalidatePath } from "next/cache";
import { serverApi } from "@/services/server";
import { usersService } from "@/services/users.service";
import { AppError } from "@/services/errors";
import type { UserRole } from "@11ftc/shared";

/**
 * Server Actions for System User provisioning (M2). They TRIGGER the api service and
 * revalidate; the API enforces admin-only + allowlist rules (ADR-0013). No business logic here.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

function fail(error: unknown): { ok: false; error: string; status: number } {
  if (error instanceof AppError) {
    return { ok: false, error: error.message, status: error.status };
  }
  return { ok: false, error: "Unexpected error", status: 0 };
}

/** Pre-authorize a Gmail on the allowlist. The account materializes on first Google login. */
export async function inviteUserAction(input: {
  email: string;
  fullName: string;
  role: UserRole;
}): Promise<ActionResult> {
  try {
    await usersService(serverApi()).invite(input);
    revalidatePath("/employees");
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

/** Activate/deactivate a user (deactivated users are rejected by M1 even with a valid JWT). */
export async function setUserActiveAction(
  userId: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await usersService(serverApi()).update(userId, { isActive });
    revalidatePath("/employees");
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

export async function setUserRoleAction(
  userId: string,
  role: UserRole,
): Promise<ActionResult> {
  try {
    await usersService(serverApi()).update(userId, { role });
    revalidatePath("/employees");
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

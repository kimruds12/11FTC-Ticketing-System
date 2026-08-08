import { z } from "zod";
import { UserRole } from "../enums.js";

const roleSchema = z.enum([UserRole.IT_ADMINISTRATOR, UserRole.IT_STAFF]);

/* ============================ System Users (public.users) ============================
 * A System User is an account that logs in (Google OAuth). Inviting = pre-authorizing an
 * email on the allowlist (ADR-0013): no password, no identity created — the account
 * materializes on the invitee's first Google login. Distinct from an Employee (no account).
 */
/**
 * Minimum password length, enforced identically here and by GoTrue's own
 * `GOTRUE_PASSWORD_MIN_LENGTH`. Stated once so the form, the API and the auth server cannot
 * disagree about what it accepts — a client-side rule that is stricter than the server's is
 * how a valid password gets rejected with no explanation.
 */
export const PASSWORD_MIN_LENGTH = 10;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(72, "Password must be 72 characters or fewer"); // bcrypt truncates beyond 72

/**
 * Invite (ADR-0018). Creates BOTH the `public.users` allowlist row and the auth account.
 *
 * `password` is optional: omit it and the server generates one, which is the intended path.
 * There is no SMTP on the internal deployment, so nothing can be emailed — the administrator
 * reads the generated password out of the response and hands it over, and the person changes
 * it after signing in.
 */
export const inviteUserSchema = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((e) => e.toLowerCase()),
  fullName: z.string().trim().min(1).max(255),
  role: roleSchema,
  /** Omit to have the server generate one. */
  password: passwordSchema.optional(),
});
export type InviteUserDto = z.infer<typeof inviteUserSchema>;

/** Admin-driven reset — the stand-in for "forgot password?", which needs email we do not have. */
export const resetPasswordSchema = z.object({
  password: passwordSchema.optional(),
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

/** Self-service change. Requires the CURRENT password, so a walk-up at an unlocked desk cannot silently take the account over. */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: passwordSchema,
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const updateUserSchema = z
  .object({
    role: roleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.role !== undefined || d.isActive !== undefined, {
    message: "provide role and/or isActive",
  });
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export interface UserDto {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  /**
   * The auth account's id. Populated AT INVITE TIME now that the account is created with the
   * allowlist row (ADR-0018); it is no longer null-until-first-login as under Google OAuth.
   */
  authUid: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The invite response. Carries the initial password EXACTLY ONCE, at creation.
 *
 * It is never stored in our database, never written to a log, and cannot be read back — the
 * administrator either passes it on now or resets it. `null` when the administrator supplied
 * the password themselves, since they already have it.
 */
export interface InvitedUserDto extends UserDto {
  temporaryPassword: string | null;
}

/* ============================== Departments (lookup) =================================
 * Contents are OPEN-4 (from the IT team, never invented). Retire with is_active = false.
 */
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
});
export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.isActive !== undefined, {
    message: "provide name and/or isActive",
  });
export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>;

export interface DepartmentDto {
  departmentId: string;
  name: string;
  isActive: boolean;
}

/* ========================= Main-issue categories (lookup) ===========================
 * A FK, not free text (System Design §4). Contents are OPEN-4.
 */
export const createMainIssueSchema = z.object({
  label: z.string().trim().min(1).max(255),
  sortOrder: z.number().int().min(0).optional(),
});
export type CreateMainIssueDto = z.infer<typeof createMainIssueSchema>;

export const updateMainIssueSchema = z
  .object({
    label: z.string().trim().min(1).max(255).optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "nothing to update" });
export type UpdateMainIssueDto = z.infer<typeof updateMainIssueSchema>;

export interface MainIssueDto {
  mainIssueId: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

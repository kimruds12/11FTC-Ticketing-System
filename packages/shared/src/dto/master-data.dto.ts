import { z } from "zod";
import { UserRole } from "../enums.js";

const roleSchema = z.enum([UserRole.IT_ADMINISTRATOR, UserRole.IT_STAFF]);

/* ============================ System Users (public.users) ============================
 * A System User is an account that logs in (Google OAuth). Inviting = pre-authorizing an
 * email on the allowlist (ADR-0013): no password, no identity created — the account
 * materializes on the invitee's first Google login. Distinct from an Employee (no account).
 */
export const inviteUserSchema = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((e) => e.toLowerCase()),
  fullName: z.string().trim().min(1).max(255),
  role: roleSchema,
});
export type InviteUserDto = z.infer<typeof inviteUserSchema>;

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
  /** null until the invitee's first Google login binds it to their Supabase sub (ADR-0013). */
  authUid: string | null;
  createdAt: string;
  updatedAt: string;
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

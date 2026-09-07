import { z } from "zod";

/**
 * Employees (M2 directory CRUD + M4 resolve-or-create). An Employee is the person who
 * REPORTED a ticket — an auth-free directory entry, NOT an account (ADR-0013). Dedup is by
 * `normalizeName` + the `name_normalized` unique index; the admin-create path and the inline
 * path share it.
 */
export const createEmployeeSchema = z.object({
  name: z.string().trim().min(1).max(255),
  departmentId: z.string().uuid(),
});
export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    departmentId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "nothing to update" });
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;

export interface EmployeeDto {
  employeeId: string;
  name: string;
  departmentId: string;
  /** Denormalized for display (joined from departments); IDs stay canonical. */
  departmentName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

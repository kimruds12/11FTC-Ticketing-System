"use server";
import { revalidatePath } from "next/cache";
import { serverApi } from "@/services/server";
import { usersService } from "@/services/users.service";
import { employeesService } from "@/services/employees.service";
import { techniciansService } from "@/services/technicians.service";
import { AppError } from "@/services/errors";
import type {
  CreateEmployeeDto,
  CreateTechnicianDto,
  EmployeeDto,
  TechnicianDto,
  UpdateEmployeeDto,
  UpdateTechnicianDto,
  UserRole,
} from "@11ftc/shared";

/**
 * Server Actions for the directory page (M2). Three distinct populations live here, and
 * conflating them is what made this page confusing:
 *
 *   - EMPLOYEES   — the people who REPORT concerns. No account (ADR-0013).
 *   - TECHNICIANS — the IT people who HANDLE tickets. No account either (ADR-0017).
 *   - USERS       — actual sign-in accounts on the Google allowlist.
 *
 * These actions TRIGGER the api services and revalidate; the API enforces admin-only rules
 * and the normalize/unique dedup. No business logic here.
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

/* ------------------------------ Employees (reporters) ------------------------------ */

export async function createEmployeeAction(
  input: CreateEmployeeDto,
): Promise<ActionResult<EmployeeDto>> {
  try {
    const employee = await employeesService(serverApi()).create(input);
    revalidatePath("/employees");
    return { ok: true, data: employee };
  } catch (error) {
    return fail(error);
  }
}

/** Corrections and retirement. Nothing is deleted — `isActive: false` retires (FR-9). */
export async function updateEmployeeAction(
  employeeId: string,
  input: UpdateEmployeeDto,
): Promise<ActionResult<EmployeeDto>> {
  try {
    const employee = await employeesService(serverApi()).update(employeeId, input);
    revalidatePath("/employees");
    return { ok: true, data: employee };
  } catch (error) {
    return fail(error);
  }
}

/* ----------------------------- Technicians (handlers) ------------------------------ */

export async function createTechnicianAction(
  input: CreateTechnicianDto,
): Promise<ActionResult<TechnicianDto>> {
  try {
    const technician = await techniciansService(serverApi()).create(input);
    revalidatePath("/employees");
    return { ok: true, data: technician };
  } catch (error) {
    return fail(error);
  }
}

export async function updateTechnicianAction(
  technicianId: string,
  input: UpdateTechnicianDto,
): Promise<ActionResult<TechnicianDto>> {
  try {
    const technician = await techniciansService(serverApi()).update(technicianId, input);
    revalidatePath("/employees");
    return { ok: true, data: technician };
  } catch (error) {
    return fail(error);
  }
}

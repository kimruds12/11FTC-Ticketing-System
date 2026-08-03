import { serverApi } from "@/services/server";
import { usersService } from "@/services/users.service";
import { employeesService } from "@/services/employees.service";
import { techniciansService } from "@/services/technicians.service";
import { lookupsService } from "@/services/lookups.service";
import DirectoryClient from "@/features/employees/DirectoryClient";
import type { User } from "@/features/employees/UserTable";
import {
  UserRole,
  type DepartmentDto,
  type EmployeeDto,
  type TechnicianDto,
  type UserDto,
} from "@11ftc/shared";

/**
 * Directory (M2 + ADR-0017). This page used to list ONLY sign-in accounts while being called
 * "Employee Management" — the actual employee directory had a complete API and no UI at all.
 * It now surfaces all three populations: employees (reporters), technicians (handlers), and
 * system users (accounts).
 *
 * Inactive rows are included deliberately: nothing is deleted (FR-9), so a retired person must
 * stay visible or their historical tickets stop making sense.
 */
const AVATAR_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-indigo-500",
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

function colorOf(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

function toRow(u: UserDto): User {
  return {
    id: u.userId,
    name: u.fullName,
    email: u.email,
    role: u.role === UserRole.IT_ADMINISTRATOR ? "IT Admin" : "IT Staff",
    // We don't track last-login; surface allowlist state instead.
    lastLogin: u.authUid ? "—" : "Pending first sign-in",
    status: u.isActive ? "Active" : "Offline",
    initials: initialsOf(u.fullName),
    avatarColor: colorOf(u.userId),
  };
}

export default async function DirectoryPage() {
  const api = serverApi();

  // Each list degrades independently: /users is admin-only and 403s for IT Staff, but that
  // must not blank out the employee and technician tabs they legitimately need.
  const [employees, technicians, users, departments] = await Promise.all([
    employeesService(api)
      .list(true)
      .catch((): EmployeeDto[] => []),
    techniciansService(api)
      .list(true)
      .catch((): TechnicianDto[] => []),
    usersService(api)
      .list()
      .catch((): UserDto[] => []),
    lookupsService(api)
      .listDepartments()
      .catch((): DepartmentDto[] => []),
  ]);

  return (
    <DirectoryClient
      employees={employees}
      technicians={technicians}
      users={users.filter((u) => u.isActive)}
      userRows={users.map(toRow)}
      departments={departments.filter((d) => d.isActive)}
    />
  );
}

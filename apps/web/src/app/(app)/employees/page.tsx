import { serverApi } from "@/services/server";
import { usersService } from "@/services/users.service";
import UserDirectoryClient from "@/features/employees/UserDirectoryClient";
import type { User } from "@/features/employees/UserTable";
import { UserRole, type UserDto } from "@11ftc/shared";

/**
 * User Directory (M2) — System Users (accounts). Server-fetches the allowlist from /users
 * (admin-only) and maps to the table's view shape; interactive bits live in the client shell.
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

export default async function UserManagementPage() {
  let users: UserDto[] = [];
  try {
    users = await usersService(serverApi()).list();
  } catch {
    // Non-admins get 403 from /users; render an empty directory rather than crash.
    users = [];
  }
  return <UserDirectoryClient initialUsers={users.map(toRow)} />;
}

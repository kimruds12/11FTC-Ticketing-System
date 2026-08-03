"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DepartmentDto,
  EmployeeDto,
  TechnicianDto,
  UserDto,
} from "@11ftc/shared";
import UserTable, { type User } from "./UserTable";
import InviteUserModal from "./InviteUserModal";
import EmployeeDirectoryTab from "./EmployeeDirectoryTab";
import TechnicianDirectoryTab from "./TechnicianDirectoryTab";
import { setUserActiveAction } from "./actions";

/**
 * Directory — three populations that were previously conflated under one "Employee
 * Management" page that in fact only listed sign-in accounts:
 *
 *   EMPLOYEES   people who REPORT concerns      no account (ADR-0013)
 *   TECHNICIANS IT people who HANDLE tickets    no account (ADR-0017)
 *   USERS       sign-in accounts (allowlist)    Google OAuth
 *
 * Each is registerable here up front, and the first two are also creatable inline from the
 * encode form. Both doors run the same server-side dedup, so they can't diverge.
 */
type TabKey = "employees" | "technicians" | "users";

interface DirectoryClientProps {
  employees: EmployeeDto[];
  technicians: TechnicianDto[];
  users: UserDto[];
  userRows: User[];
  departments: DepartmentDto[];
}

const TABS: Array<{ key: TabKey; label: string; sub: string }> = [
  { key: "employees", label: "Employees", sub: "Report concerns" },
  { key: "technicians", label: "Technicians", sub: "Handle tickets" },
  { key: "users", label: "System Users", sub: "Sign-in accounts" },
];

export default function DirectoryClient({
  employees,
  technicians,
  users,
  userRows,
  departments,
}: DirectoryClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("employees");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const counts: Record<TabKey, number> = {
    employees: employees.length,
    technicians: technicians.length,
    users: userRows.length,
  };

  const filteredUsers = userRows.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleToggleActive(userId: string, nextActive: boolean) {
    const res = await setUserActiveAction(userId, nextActive);
    if (res.ok) router.refresh();
    else alert(res.error);
  }

  return (
    <div className="space-y-6 w-full px-4 md:px-8 py-6">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Directory
          </h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">
            Employees who report concerns, technicians who resolve them, and system accounts.
          </p>
        </div>
        {tab === "users" && (
          <button
            onClick={() => setInviteOpen(true)}
            className="btn-primary self-start sm:self-auto shadow-sm"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add User
          </button>
        )}
      </div>

      {/* ── Tabs & Search ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-card">
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setSearch("");
              }}
              title={t.sub}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 whitespace-nowrap ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[10px] font-bold text-gray-400">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 md:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${TABS.find((t) => t.key === tab)?.label.toLowerCase()}…`}
            className="input pl-9 w-full"
          />
        </div>
      </div>

      {tab === "employees" && (
        <EmployeeDirectoryTab
          employees={employees}
          departments={departments}
          search={search}
        />
      )}

      {tab === "technicians" && (
        <TechnicianDirectoryTab technicians={technicians} users={users} search={search} />
      )}

      {tab === "users" && (
        <>
          {userRows.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              System accounts are visible to IT Administrators only. Recording who handled a
              ticket does not require an account — use the Technicians tab.
            </div>
          )}
          <UserTable users={filteredUsers} onToggleActive={handleToggleActive} />
        </>
      )}

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => {
          setInviteOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

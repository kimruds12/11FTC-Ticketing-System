"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UserTabs from "./UserTabs";
import UserTable, { User } from "./UserTable";
import InviteUserModal from "./InviteUserModal";
import { setUserActiveAction } from "./actions";

/**
 * Client shell for the User Directory. The server page fetches real users (from /users) and
 * passes them in; this component owns the interactive bits (tabs, search, invite, toggle).
 * Mutations go through Server Actions; `router.refresh()` re-reads the server data.
 */
export default function UserDirectoryClient({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const filteredUsers = initialUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "admin" && user.role === "IT Admin") ||
      (activeTab === "staff" && user.role === "IT Staff");
    return matchesSearch && matchesTab;
  });

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
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">User Directory</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">Manage system access, roles, and support credentials.</p>
        </div>
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
      </div>

      {/* ── Tabs & Filter Bar ──────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-card">
        <UserTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
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
              placeholder="Search users..."
              className="input pl-9"
            />
          </div>
        </div>
      </div>

      {/* ── Table view ──────────────────────────────────────── */}
      <UserTable users={filteredUsers} onToggleActive={handleToggleActive} />

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

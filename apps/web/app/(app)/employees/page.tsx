"use client";

import { useState } from "react";

/* ── Mock data ────────────────────────────────────────────── */
const MOCK_USERS = [
  {
    id: "1",
    name: "Sarah Jenkins",
    email: "s.jenkins@11ftc.com",
    role: "IT Admin",
    department: "Infrastructure",
    lastLogin: "2 mins ago",
    status: "Active",
    initials: "SJ",
    color: "bg-blue-500",
  },
  {
    id: "2",
    name: "Marcus Chen",
    email: "m.chen@11ftc.com",
    role: "Staff",
    department: "Helpdesk L1",
    lastLogin: "1 hour ago",
    status: "Active",
    initials: "MC",
    color: "bg-green-500",
  },
  {
    id: "3",
    name: "Elena Rodriguez",
    email: "e.rodriguez@11ftc.com",
    role: "Staff",
    department: "Helpdesk L2",
    lastLogin: "Yesterday",
    status: "Offline",
    initials: "ED",
    color: "bg-purple-500",
  },
  {
    id: "4",
    name: "James Peterson",
    email: "j.peterson@11ftc.com",
    role: "IT Admin",
    department: "Security",
    lastLogin: "Oct 12, 2023",
    status: "Locked",
    initials: "JP",
    color: "bg-amber-500",
  },
];

const TABS = ["All Users (1,248)", "IT Admin", "Helpdesk Staff"];

const STATUS_DOT: Record<string, string> = {
  Active: "bg-green-500",
  Offline: "bg-gray-300",
  Locked: "bg-red-500",
};

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    "IT Admin": "bg-blue-50 text-blue-700 border border-blue-200",
    Staff: "bg-gray-50 text-gray-600 border border-gray-200",
  };
  const icons: Record<string, React.ReactNode> = {
    "IT Admin": (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    Staff: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${map[role] ?? "bg-gray-100 text-gray-600"}`}>
      {icons[role]}
      {role}
    </span>
  );
}

/* ── Add User Modal ───────────────────────────────────────── */
function AddUserModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", role: "Staff", department: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className="input" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input" placeholder="john.doe@11ftc.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
              <select value={form.role} onChange={(e) => set("role", e.target.value)} className="input">
                <option>IT Admin</option>
                <option>Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Department</label>
              <select value={form.department} onChange={(e) => set("department", e.target.value)} className="input">
                <option value="">Select…</option>
                <option>Infrastructure</option>
                <option>Helpdesk L1</option>
                <option>Helpdesk L2</option>
                <option>Security</option>
                <option>Finance</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button className="btn-primary flex-1">Create User</button>
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = MOCK_USERS.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      activeTab === 0 ||
      (activeTab === 1 && u.role === "IT Admin") ||
      (activeTab === 2 && u.role === "Staff");
    return matchSearch && matchTab;
  });

  return (
    <>
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}

      <div className="space-y-5 max-w-[1100px]">
        {/* ── Page header ─────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Directory</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage system access, roles, and department assignments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                className="input pl-9 w-56"
              />
            </div>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </button>
          </div>
        </div>

        <div className="card overflow-hidden">
          {/* Tabs + filter bar */}
          <div className="flex items-center justify-between px-4 pt-3 border-b border-gray-100">
            <div className="flex gap-1">
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t transition-colors ${
                    activeTab === i
                      ? "text-primary-700 border-b-2 border-primary-700 -mb-px"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mr-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filter
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead className="bg-gray-50">
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-400 text-sm">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      {/* Name + email */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                            {user.initials}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td><RoleBadge role={user.role} /></td>
                      {/* Department */}
                      <td>
                        <span className="text-primary-700 font-medium text-sm">{user.department}</span>
                      </td>
                      {/* Last login */}
                      <td className="text-sm text-gray-500">{user.lastLogin}</td>
                      {/* Status */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[user.status]}`} />
                          <span
                            className={`text-sm font-medium ${
                              user.status === "Active"
                                ? "text-green-600"
                                : user.status === "Locked"
                                ? "text-red-600"
                                : "text-gray-400"
                            }`}
                          >
                            {user.status}
                          </span>
                        </div>
                      </td>
                      {/* Actions */}
                      <td>
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 text-gray-400 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title={user.status === "Active" ? "Deactivate" : "Activate"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing 1 to 4 of 1,248</span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded border border-primary-700 bg-primary-700 text-white text-sm font-semibold">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">3</button>
              <span className="px-1 text-gray-400">…</span>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

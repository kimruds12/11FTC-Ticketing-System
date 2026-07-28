"use client";

import { useState } from "react";
import UserTabs from "@/features/employees/UserTabs";
import UserTable, { User } from "@/features/employees/UserTable";

const initialUsers: User[] = [];

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const filteredUsers = initialUsers.filter((user) => {
    // Search filter
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());

    // Tab filter
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "admin" && user.role === "IT Admin") ||
      (activeTab === "staff" && user.role === "IT Staff");

    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6 w-full px-4 md:px-8 py-6">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">User Directory</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">Manage system access, roles, and support credentials.</p>
        </div>
        <button className="btn-primary self-start sm:self-auto shadow-sm">
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
          {/* Search */}
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

          {/* Filter Action */}
          <button className="btn-outline flex items-center gap-1.5 px-3 py-2 text-xs font-bold">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
          </button>
        </div>
      </div>

      {/* ── Table view ──────────────────────────────────────── */}
      <UserTable users={filteredUsers} />
    </div>
  );
}

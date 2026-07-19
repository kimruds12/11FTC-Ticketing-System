"use client";

import { useState } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "IT Admin" | "IT Staff";
  lastLogin: string;
  status: "Active" | "Offline" | "Locked";
  initials: string;
  avatarColor: string;
}

interface UserTableProps {
  users: User[];
}

const statusDotColor: Record<User["status"], string> = {
  Active: "bg-green-600",
  Offline: "bg-gray-400",
  Locked: "bg-red-600",
};

export default function UserTable({ users }: UserTableProps) {
  const [userStates, setUserStates] = useState<Record<string, boolean>>(
    users.reduce((acc, user) => ({
      ...acc,
      [user.id]: user.status === "Active"
    }), {})
  );

  const handleToggle = (userId: string) => {
    setUserStates(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  return (
    <div className="w-full overflow-hidden bg-white rounded-xl border border-gray-200 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length > 0 ? (
              users.map((user) => {
                const isActive = userStates[user.id] ?? false;
                return (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Name (Avatar + Full name + email) */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${user.avatarColor} border border-white shadow-sm`}>
                          {user.initials}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 leading-tight">{user.name}</div>
                          <div className="text-xs text-gray-400 font-semibold mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        user.role === "IT Admin"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}>
                        {user.role === "IT Admin" ? (
                          <>
                            <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            IT Admin
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            IT Staff
                          </>
                        )}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {user.lastLogin}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isActive ? "bg-green-600" : "bg-gray-400"}`} />
                        <span className="text-gray-700 font-bold text-xs">{isActive ? "Active" : "Offline"}</span>
                      </span>
                    </td>

                    {/* Actions (Picture 3 Aligned Toggle Switch + Edit + Delete) */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center gap-4">
                        {/* Toggle Switch */}
                        <button
                          onClick={() => handleToggle(user.id)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                            isActive ? "bg-green-500" : "bg-gray-200"
                          }`}
                          role="switch"
                          aria-checked={isActive}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>

                        {/* Edit Icon */}
                        <button
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Edit user info"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        {/* Delete Icon */}
                        <button
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete user"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400 font-medium">
                  No users found in directory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 text-xs font-semibold text-gray-400">
        <span>Showing 1 to {users.length} of {users.length}</span>
        <div className="flex gap-2">
          <button className="p-1 px-2.5 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50" disabled>
            &lt;
          </button>
          <button className="p-1 px-2.5 rounded border border-gray-200 bg-red-700 text-white font-bold">
            1
          </button>
          <button className="p-1 px-2.5 rounded border border-gray-200 bg-white hover:bg-gray-50" disabled>
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

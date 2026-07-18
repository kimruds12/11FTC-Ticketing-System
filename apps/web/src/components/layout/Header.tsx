"use client";

import { useState } from "react";

interface HeaderProps {
  breadcrumb?: string[];
  title?: string;
}

export default function Header({ breadcrumb, title }: HeaderProps) {
  const [hasNotifications] = useState(true);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header
      className="fixed top-0 left-[220px] right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20"
      style={{ boxShadow: "0 1px 0 0 #E5E7EB" }}
    >
      {/* ── Left: breadcrumb / page title ────────────────── */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumb ? (
          breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              <span
                className={
                  i === breadcrumb.length - 1
                    ? "font-semibold text-gray-900"
                    : "text-gray-500 hover:text-gray-700 cursor-pointer"
                }
              >
                {crumb}
              </span>
            </span>
          ))
        ) : (
          <span className="font-semibold text-gray-900">{title ?? "Dashboard"}</span>
        )}
      </div>

      {/* ── Right: date, notification, user ──────────────── */}
      <div className="flex items-center gap-5">
        {/* Date */}
        <div className="hidden md:flex items-center gap-2 text-gray-500 text-sm">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {today}
        </div>

        {/* Notification bell */}
        <button className="relative p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {hasNotifications && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-700 rounded-full" />
          )}
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-xs font-bold">
            AU
          </div>
          <div className="hidden md:block text-right">
            <div className="text-sm font-semibold text-gray-900 leading-none">Admin User</div>
            <div className="text-xs text-gray-400 mt-0.5">System Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}

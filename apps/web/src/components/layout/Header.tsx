"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { UserRole } from "@11ftc/shared";
import { clearSession } from "@/store/slices/authSlice";
import { getBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Application Header
 *
 * Behavior per page:
 *  - Dashboard: Shows current date, real-time clock, and period filter dropdown
 *  - Other pages: Shows large page title with optional breadcrumb
 *
 * Common: User profile button (right) with dropdown, notification bell, hamburger on mobile
 *
 * Removed: Settings icon (per requirements)
 */

/* ── Route metadata ────────────────────────────────── */
const routeMeta: Record<string, { breadcrumb: string[]; title: string; subtitle?: string }> = {
  "/dashboard": {
    breadcrumb: ["Dashboard"],
    title: "Dashboard",
    subtitle: "Real-time IT metrics and ticket status.",
  },
  "/tickets": {
    breadcrumb: ["Ticket Management"],
    title: "Ticket Management",
    subtitle: "Manage and track IT tickets.",
  },
  // No "/tickets/new" entry: encoding is a modal over the queue, not a route. A dedicated
  // page cost a full server round trip — lookups, layout, shell — every time someone recorded
  // a ticket, and the form was already modal chrome dimming a page that wasn't there.
  "/reports": {
    breadcrumb: ["Generate Reports"],
    title: "Generate Reports",
    subtitle: "Export operational and analytics reports.",
  },
  "/audit-logs": {
    breadcrumb: ["Audit Logs"],
    title: "Audit Logs",
    subtitle: "Read-only view of staff actions and ticket operations.",
  },
};

interface ActivityNotification {
  id: string;
  icon: ReactNode;
  title: string;
  desc: string;
  time: string;
  tag: string;
}

interface TicketNotification {
  id: string;
  title: string;
  status: "OPEN" | "ONGOING" | "CLOSED";
  desc: string;
  time: string;
}

interface HeaderProps {
  onMenuToggle?: () => void;
  isSidebarCollapsed?: boolean;
}

export default function Header({ onMenuToggle, isSidebarCollapsed }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const role = useAppSelector((state) => state.auth.role);
  const fullName = useAppSelector((state) => state.auth.fullName);
  const email = useAppSelector((state) => state.auth.email);
  const isDashboard = pathname === "/dashboard";
  const meta = routeMeta[pathname] ?? { breadcrumb: ["11FTC"], title: "FTraCe" };

  /* ── Real-time clock (all pages) ─────────────────── */
  // null until mount: a live clock rendered during SSR would not match the client's time on
  // hydration (the reported mismatch). Starting from null keeps the server output and the
  // first client render identical; the effect then starts ticking.
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- avoids SSR/client time mismatch
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime
    ? currentTime.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const formattedTime = currentTime
    ? currentTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "";

  /* ── Profile dropdown ────────────────────────────── */
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  /**
   * Sign out for real.
   *
   * This used to be `router.push("/sign-in")` and nothing else — the Supabase session cookie
   * survived, so the app shell saw a valid session and sent the user straight back to the
   * dashboard. Clicking "Logout" left you signed in.
   */
  const handleSignOut = async () => {
    await getBrowserSupabase().auth.signOut();
    dispatch(clearSession());
    router.push("/sign-in");
    router.refresh();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Notification Popover (Picture 4 aligned) ────── */
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<"activity" | "tickets">("activity");
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mock Notifications data for Activity and Tickets tabs (cleared/empty per instructions)
  const recentActivities: ActivityNotification[] = [];
  const recentTickets: TicketNotification[] = [];

  /* ── Sidebar offset calculation ──────────────────── */
  const sidebarWidth = isSidebarCollapsed ? "72px" : "240px";

  return (
    <>
      <header
        className="fixed top-0 right-0 h-16 bg-white/95 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between px-4 md:px-6 z-header main-transition"
        style={{ left: `var(--sidebar-width, ${sidebarWidth})`, boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}
      >
      {/* ── Left Section ────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger (mobile/tablet) */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {isDashboard ? (
          /* ── Dashboard: breadcrumb title ────────── */
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-gray-900 hidden sm:block">{meta.title}</h1>
          </div>
        ) : (
          /* ── Other pages: large page title ──────── */
          <div className="flex items-center gap-2">
            {meta.breadcrumb.length > 1 && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400">
                {meta.breadcrumb.slice(0, -1).map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    <span className="font-medium">{crumb}</span>
                  </span>
                ))}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
            <h1 className="text-lg font-bold text-gray-900 truncate">{meta.title}</h1>
          </div>
        )}
      </div>

      {/* ── Center: Real-time Date/Time (Consistent on all pages) ── */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold text-gray-700">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-bold text-gray-800 tabular-nums">{formattedTime}</span>
        </div>
      </div>

      {/* ── Right Section ───────────────────────────── */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Notification Bell (Stateful dropdown, bigger icon) */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
            className={`relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-200 ${
              showNotificationDropdown ? "bg-gray-50 text-gray-700" : ""
            }`}
            aria-label="View notifications"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Redesigned Notification Popover (Picture 4 aligned, 0 Active notifications) */}
          {showNotificationDropdown && (
            <div className="absolute right-0 mt-3 w-[400px] bg-white rounded-2xl border border-gray-200 shadow-dropdown py-4 z-dropdown animate-slide-down flex flex-col max-h-[500px]">
              <div className="px-4 pb-3 flex justify-between items-center border-b border-gray-100">
                <span className="text-xs font-bold text-gray-800 tracking-wider">NOTIFICATIONS</span>
                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
                  0 ACTIVE
                </span>
              </div>

              {/* Tabs selector */}
              <div className="px-4 py-3 bg-gray-50/50 flex gap-2">
                <button
                  onClick={() => setActiveNotifTab("activity")}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all duration-150 border ${
                    activeNotifTab === "activity"
                      ? "bg-white text-primary-700 shadow-sm border-gray-200"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-transparent"
                  }`}
                >
                  RECENT ACTIVITY
                </button>
                <button
                  onClick={() => setActiveNotifTab("tickets")}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all duration-150 border ${
                    activeNotifTab === "tickets"
                      ? "bg-white text-primary-700 shadow-sm border-gray-200"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-transparent"
                  }`}
                >
                  TICKETS
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100 flex flex-col justify-center min-h-[160px]">
                {activeNotifTab === "activity" ? (
                  recentActivities.length > 0 ? (
                    recentActivities.map((act) => (
                      <div key={act.id} className="p-4 hover:bg-gray-50/50 transition-colors flex gap-3 items-start cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-100">
                          {act.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 leading-tight">{act.title}</p>
                          <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">{act.desc}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase">{act.time}</span>
                            <span className="text-gray-300 text-xs font-normal">•</span>
                            <span className="text-[9px] text-primary-700 font-bold tracking-wider uppercase">{act.tag}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                      <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs font-bold uppercase">NO RECENT ACTIVITY</p>
                      <p className="text-[10px] mt-0.5 font-semibold">Everything is caught up.</p>
                    </div>
                  )
                ) : (
                  recentTickets.length > 0 ? (
                    recentTickets.map((tkt) => (
                      <div key={tkt.id} className="p-4 hover:bg-gray-50/50 transition-colors flex gap-3 items-start cursor-pointer" onClick={() => { router.push(`/tickets/${tkt.id}`); setShowNotificationDropdown(false); }}>
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-primary-700 flex items-center justify-center flex-shrink-0 border border-red-100 font-bold text-xs">
                          T
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-sm font-bold text-gray-900 leading-tight truncate">{tkt.title}</p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                              tkt.status === "OPEN" ? "bg-red-50 text-red-700 border-red-200" :
                              tkt.status === "ONGOING" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-green-50 text-green-700 border-green-200"
                            }`}>
                              {tkt.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed truncate">{tkt.desc}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-primary-700 font-bold">{tkt.id}</span>
                            <span className="text-gray-300 text-xs font-normal">•</span>
                            <span className="text-[9px] text-gray-400 font-semibold">{tkt.time}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                      <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-xs font-bold uppercase">NO ACTIVE TICKETS</p>
                      <p className="text-[10px] mt-0.5 font-semibold">No alerts to display.</p>
                    </div>
                  )
                )}
              </div>

              <div className="border-t border-gray-100 px-4 pt-3 text-center">
                <button className="text-xs font-bold text-primary-700 hover:text-primary-800 transition-colors uppercase tracking-wider">
                  VIEW ALL ACTIVITY
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 hidden sm:block" />

        {/* User Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 md:gap-3 p-1.5 rounded-lg hover:bg-gray-50 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-200"
            aria-expanded={showProfileDropdown}
            aria-haspopup="true"
            aria-label="User menu"
          >
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-gray-900 leading-tight">
                {fullName || (role === UserRole.IT_ADMINISTRATOR ? "Admin User" : "IT Staff")}
              </div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                {role === UserRole.IT_ADMINISTRATOR ? "System Administrator" : "IT Staff Technician"}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-primary-100">
              {fullName ? fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "IT"}
            </div>
            <svg className={`w-4 h-4 text-gray-400 hidden sm:block transition-transform duration-200 ${showProfileDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showProfileDropdown && (
            <div className="dropdown-menu animate-slide-down" role="menu">
              {/* Profile Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">
                  {fullName || (role === UserRole.IT_ADMINISTRATOR ? "Admin User" : "IT Staff")}
                </p>
                {/* The REAL address from the verified session. This used to render a
                    hardcoded admin@gmail.com / staff@gmail.com — invented data shown as the
                    user's own identity. */}
                <p className="text-xs text-gray-400 mt-0.5">{email ?? "—"}</p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button className="dropdown-item w-full text-left" role="menuitem" onClick={() => { setShowProfileDropdown(false); router.push("/account"); }}>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>
                <button
                  className="dropdown-item w-full text-left"
                  role="menuitem"
                  onClick={() => { setShowProfileDropdown(false); router.push("/account"); }}
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Change password
                </button>
              </div>

              <div className="dropdown-divider" />

              <button 
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-semibold flex items-center gap-2 hover:bg-red-800 hover:text-white transition-all duration-150 rounded-b-xl" 
                role="menuitem" 
                onClick={() => { setShowProfileDropdown(false); void handleSignOut(); }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
}

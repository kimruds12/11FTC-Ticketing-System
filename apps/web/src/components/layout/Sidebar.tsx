"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { UserRole } from "@11ftc/shared";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  /**
   * Fired when a destination is chosen. On desktop the sidebar is permanent and this is a
   * no-op; on a phone it is what dismisses the drawer, which otherwise stays open on top of
   * the page it just navigated to.
   */
  onNavigate?: () => void;
}

export default function Sidebar({ isCollapsed, onToggleCollapse, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const role = useAppSelector((state) => state.auth.role);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  /* ── Sidebar Navigation items based on Role (SRS §3.3) ── */
  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      visible: true,
    },
    {
      label: "Ticket Management",
      href: "/tickets",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
      visible: true,
    },
    {
      label: "Directory",
      href: "/employees",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      visible: role === UserRole.IT_ADMINISTRATOR, // Admin-only (SRS §3.3)
    },
    {
      label: "Generate Reports",
      href: "/reports",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      visible: true,
    },
    {
      label: "Audit Logs",
      href: "/audit-logs",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      visible: true,
    },
  ];

  return (
    <aside
      className={`flex flex-col min-h-screen bg-white border-r border-gray-100 fixed left-0 top-0 bottom-0 z-sidebar shadow-sidebar sidebar-transition ${
        isCollapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* ── Collapsible Tab Button (Sticking out, overlapping right border) ── */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-primary-700 text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-primary-800 transition-all duration-200 z-50 focus:outline-none focus:ring-2 focus:ring-primary-300"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg
          className={`w-3 h-3 transition-transform duration-250 ${isCollapsed ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* ── Logo ─────────────────────────────────────────── */}
      <div className={`flex items-center border-b border-gray-100 ${isCollapsed ? "px-3 py-4 justify-center" : "px-5 py-4 gap-3"}`}>
        <div className="relative w-9 h-9 flex-shrink-0">
          <Image
            src="/logo.png"
            alt="FTraCe Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <div className="font-bold text-primary-700 text-base leading-none tracking-tight">FTraCe</div>
            <div className="text-gray-400 text-[10px] mt-0.5 font-medium">
              {role === UserRole.IT_ADMINISTRATOR ? "IT Admin Portal" : "IT Staff Portal"}
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems
          .filter((item) => item.visible)
          .map((item) => {
            const active = isActive(item.href);
            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`nav-touch flex items-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-200 ${
                    isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
                  } ${
                    active
                      ? "bg-primary-50 text-primary-700 font-semibold border-l-[3px] border-primary-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={`flex-shrink-0 ${active ? "text-primary-700" : "text-gray-400 group-hover:text-gray-600"}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="text-sm truncate">{item.label}</span>
                  )}
                </Link>

                {/* Tooltip (collapsed state only) */}
                {isCollapsed && (
                  <span className="tooltip" role="tooltip">
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
      </nav>


    </aside>
  );
}

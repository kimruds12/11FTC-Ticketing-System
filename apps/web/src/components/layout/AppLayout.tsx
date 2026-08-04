"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

const SIDEBAR_COLLAPSED_KEY = "ftrace-sidebar-collapsed";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  /* ── Persist collapsed state ──────────────────────── */
  useEffect(() => {
    // Restore on mount from localStorage, which is unavailable during SSR. Reading it in a
    // lazy useState initializer instead would desync server/client markup (hydration
    // mismatch); setting state post-mount is the SSR-safe idiom here.
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe restore-on-mount
    if (saved === "true") setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  };

  const sidebarWidth = isCollapsed ? 72 : 240;

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Mobile Sidebar Backdrop ─────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-overlay lg:hidden print-hide"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ────────────────────────────────── */}
      {/* `print-hide`: app chrome is not part of a printed report — see the @media print
          block in globals.css, which also cancels the offsets these two elements impose. */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-overlay transition-transform duration-300 lg:translate-x-0 print-hide ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* ── Main Content Wrapper ────────────────────── */}
      <div
        className="app-main flex flex-col min-h-screen main-transition"
        style={{ paddingLeft: `${sidebarWidth}px` }}
      >
        <div className="print-hide">
          <Header
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            isSidebarCollapsed={isCollapsed}
          />
        </div>
        <main className="flex-1 p-4 md:p-6 lg:p-8 pt-20 lg:pt-20">
          {children}
        </main>
      </div>

      {/* ── CSS Variable for Header ────────────────── */}
      <style>{`
        :root {
          --sidebar-width: ${sidebarWidth}px;
        }
        @media (max-width: 1023px) {
          :root {
            --sidebar-width: 0px;
          }
        }
      `}</style>
    </div>
  );
}

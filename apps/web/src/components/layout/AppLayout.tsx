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
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          // Tapping a destination in the drawer must dismiss it. Without this the drawer
          // navigates underneath itself and stays open over the page it just loaded, which
          // on a phone reads as "the link did nothing".
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      {/* ── Main Content Wrapper ────────────────────── */}
      {/* Offset comes from `--sidebar-width`, NOT from a literal px value.
          It used to be `paddingLeft: ${sidebarWidth}px` inline — and an inline style cannot
          be reached by a media query. Below `lg` the sidebar is translated off-canvas, but
          the content kept its 240px indent anyway: on a 375px phone that left ~103px of
          usable width once `p-4` was applied. The variable is already zeroed under 1024px in
          the style block below, which is how the Header avoided this; the content wrapper
          simply never adopted it. One variable, one source of truth, both consumers. */}
      <div
        className="app-main flex flex-col min-h-screen main-transition"
        style={{ paddingLeft: "var(--sidebar-width, 0px)" }}
      >
        <div className="print-hide">
          <Header
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            isSidebarCollapsed={isCollapsed}
          />
        </div>
        {/* Safe-area insets live in globals.css (`.app-main > main`), not inline: an inline
            padding would pin left/right at one value and cancel the md/lg scale-up. */}
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

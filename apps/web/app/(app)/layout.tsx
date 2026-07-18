import type { Metadata } from "next";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "11FTC | IT Support System",
};

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Protected app shell.
 * - Sidebar fixed on the left (220px)
 * - Header fixed at the top (56px)
 * - Main content area offset to avoid overlap
 *
 * In production: add a server-side session check here and redirect to /sign-in
 * when no session is found (Supabase auth.getSession()).
 */
export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-surface">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Fixed Header */}
      <Header />

      {/* Main content — offset by sidebar width (220px) and header height (56px) */}
      <main className="ml-[220px] pt-14 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

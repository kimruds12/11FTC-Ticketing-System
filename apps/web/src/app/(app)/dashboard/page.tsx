"use client";

import { useAppSelector } from "@/store/hooks";
import { UserRole } from "@11ftc/shared";
import AdminDashboard from "@/features/dashboard/AdminDashboard";
import StaffDashboard from "@/features/dashboard/StaffDashboard";

/**
 * Dashboard Page composition root.
 *
 * Dynamically switches between AdminDashboard and StaffDashboard based on the user's role
 * to realize role-based module access constraints (SRS §3.3).
 */
export default function DashboardPage() {
  const role = useAppSelector((state) => state.auth.role);

  if (role === UserRole.IT_ADMINISTRATOR) {
    return <AdminDashboard />;
  }

  return <StaffDashboard />;
}

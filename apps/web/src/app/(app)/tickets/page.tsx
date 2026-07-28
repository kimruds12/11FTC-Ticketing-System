"use client";

import { useState } from "react";
import TicketFilters from "@/features/tickets/TicketFilters";
import TicketTable, { Ticket } from "@/features/tickets/TicketTable";

/**
 * Ticket Management Page — Queue + Filters
 *
 * Per FR-3: Search and filter by date range, status, department, main issue,
 * employee, assigned technician.
 *
 * Status: Open, Ongoing, Closed only (SRS Rev 4).
 * No priority field (SRS §11 defers SLA/priority).
 *
 * Both roles may view and filter tickets (§3.3).
 */

const initialTickets: Ticket[] = [];

export default function TicketManagementPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [department, setDepartment] = useState("all");
  const [issue, setIssue] = useState("all");

  const filteredTickets = initialTickets.filter((ticket) => {
    // Search by ID, employee, or issue (FR-3)
    const matchesSearch =
      ticket.id.toLowerCase().includes(search.toLowerCase()) ||
      ticket.employee.toLowerCase().includes(search.toLowerCase()) ||
      ticket.mainIssue.toLowerCase().includes(search.toLowerCase());

    // Status filter — Open / Ongoing / Closed only (SRS Rev 4)
    const matchesStatus =
      status === "all" ||
      (status === "Open" && ticket.status === "OPEN") ||
      (status === "Ongoing" && ticket.status === "Ongoing") ||
      (status === "Closed" && ticket.status === "Closed");

    // Department filter
    const matchesDepartment = department === "all" || ticket.department === department;

    // Issue filter
    const matchesIssue = issue === "all" || ticket.mainIssue === issue;

    return matchesSearch && matchesStatus && matchesDepartment && matchesIssue;
  });

  return (
    <div className="space-y-6 w-full px-4 md:px-8 py-6">
      {/* ── Search & Filter Controls ──────────────── */}
      <TicketFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        department={department}
        onDepartmentChange={setDepartment}
        issue={issue}
        onIssueChange={setIssue}
      />

      {/* ── Data Table ────────────────────────────── */}
      <TicketTable tickets={filteredTickets} />
    </div>
  );
}

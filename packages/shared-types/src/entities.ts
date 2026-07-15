import { AuditAction, SyncOperation, SyncStatus, TicketStatus, UserRole } from './enums';

// ============================================================
// Entity interfaces — mirrors the database schema per SRS §5–§9A
// ============================================================

/** SRS §5 — Ticket entity */
export interface Ticket {
  ticketId: string;
  ticketNo: string;
  date: string; // ISO date (YYYY-MM-DD). May be in the past (FR-5).
  sequenceScope: string;
  sequenceNumber: number;
  employeeId: string;
  mainIssueId: string;
  concern: string;
  assignedTo: string | null;
  createdBy: string;
  status: TicketStatus;
  remarks: string | null;
  ongoingAt: string | null; // ISO timestamp. Set once on first entry to Ongoing.
  closedAt: string | null; // ISO timestamp. Set once on entry to Closed.
  createdAt: string;
  updatedAt: string;
}

/** SRS §6 — Employee entity */
export interface Employee {
  employeeId: string;
  name: string;
  nameNormalized: string;
  departmentId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** SRS §6A — Department entity */
export interface Department {
  departmentId: string;
  name: string;
  isActive: boolean;
}

/** SRS §6B — Main Issue Category entity */
export interface MainIssueCategory {
  mainIssueId: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

/** SRS §6C — User entity */
export interface User {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** SRS §7 — Audit Log entry */
export interface AuditLog {
  auditLogId: string;
  ticketId: string;
  action: AuditAction;
  fieldName: string | null;
  previousValue: string | null;
  newValue: string | null;
  updatedBy: string;
  updatedAt: string;
}

/** SRS §9 — Ticket Sequence */
export interface TicketSequence {
  scopeKey: string;
  lastSequence: number;
  updatedAt: string;
}

/** SRS §9A — Sync Outbox entry */
export interface SyncOutbox {
  outboxId: string;
  ticketId: string;
  operation: SyncOperation;
  rowKey: string;
  payload: Record<string, unknown>;
  status: SyncStatus;
  attempts: number;
  rawRowNumber: number | null;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

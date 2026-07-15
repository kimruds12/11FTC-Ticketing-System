// ============================================================
// Enums — Ticket Status, User Role, Audit Action, Sync Status
// ============================================================

/**
 * Ticket status — the department uses exactly three statuses.
 * See SRS §5, FR-1.
 *
 * - Open: logged but not yet attempted (uncommon).
 * - Ongoing: attempted, could not be finished at the time.
 * - Closed: solved. Terminal — a recurrence is a new ticket (FR-8).
 */
export enum TicketStatus {
  OPEN = 'Open',
  ONGOING = 'Ongoing',
  CLOSED = 'Closed',
}

/**
 * User role — see SRS §3.
 */
export enum UserRole {
  IT_ADMINISTRATOR = 'IT_ADMINISTRATOR',
  IT_STAFF = 'IT_STAFF',
}

/**
 * Audit log action — see SRS §7.
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  ASSIGN = 'ASSIGN',
  STATUS_CHANGE = 'STATUS_CHANGE',
  CLOSE = 'CLOSE',
}

/**
 * Sync outbox status — see SRS §9A.
 */
export enum SyncStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

/**
 * Sync outbox operation — currently only UPSERT.
 */
export enum SyncOperation {
  UPSERT = 'UPSERT',
}

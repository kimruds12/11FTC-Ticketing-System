import { TicketStatus } from './enums';

// ============================================================
// API DTOs — Request and response types shared between frontend and API
// ============================================================

/** Create a new ticket — FR-2: may be created in any status, defaults to Closed */
export interface CreateTicketDto {
  date: string;
  employeeId: string;
  mainIssueId: string;
  concern: string;
  assignedTo?: string | null;
  status?: TicketStatus; // Defaults to Closed (FR-2)
  remarks?: string | null;
}

/** Update an existing ticket */
export interface UpdateTicketDto {
  employeeId?: string;
  mainIssueId?: string;
  concern?: string;
  assignedTo?: string | null;
  status?: TicketStatus;
  remarks?: string | null;
}

/** Create a new employee — FR-13: inline from ticket form */
export interface CreateEmployeeDto {
  name: string;
  departmentId: string;
}

/** Update an existing employee */
export interface UpdateEmployeeDto {
  name?: string;
  departmentId?: string;
  isActive?: boolean;
}

/** Create a new user */
export interface CreateUserDto {
  email: string;
  fullName: string;
  role: string;
  password: string;
}

/** Update an existing user */
export interface UpdateUserDto {
  email?: string;
  fullName?: string;
  role?: string;
  isActive?: boolean;
}

/** Create a department */
export interface CreateDepartmentDto {
  name: string;
}

/** Create a main issue category */
export interface CreateMainIssueCategoryDto {
  label: string;
  sortOrder?: number;
}

// ============================================================
// Pagination & filtering
// ============================================================

/** Standard paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/** Ticket list filters — FR-3 */
export interface TicketFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: TicketStatus;
  departmentId?: string;
  mainIssueId?: string;
  employeeId?: string;
  assignedTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================
// Dashboard analytics — FR-17 through FR-24
// ============================================================

/** Dashboard summary stats */
export interface DashboardSummary {
  totalTickets: number;
  openCount: number;
  ongoingCount: number;
  closedCount: number;
  firstTimeFixRate: number; // FR-23: proportion of Closed with ongoing_at IS NULL
}

/** Time-series bucket for charts — FR-17, FR-21 */
export interface TimeBucket {
  bucket: string;
  count: number;
}

/** Category breakdown — FR-18, FR-19, FR-20 */
export interface CategoryCount {
  label: string;
  count: number;
}

/** Ongoing ticket ageing — FR-24 */
export interface OngoingAgeing {
  ticketNo: string;
  date: string;
  ongoingAt: string;
  outstandingDays: number;
}

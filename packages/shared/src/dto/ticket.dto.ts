import { z } from "zod";
import { TicketStatus } from "../enums.js";
import type { AuditEntryDto } from "./audit.dto.js";
import type { TicketAssigneeDto } from "./technician.dto.js";

/**
 * WHO HANDLED THE TICKET — one field, NAMES not IDs (ADR-0017).
 *
 * Names rather than UUIDs is the whole point: the API resolve-or-creates each technician
 * inside the encode transaction, exactly as it already does for `employeeName`. So picking
 * "Patrick" from the list and typing a technician who has never been recorded before are
 * the same request, and neither needs an admin to provision anything first.
 *
 * An array because two-technician work is 21% of the real history ("Kim/Paul"). Order is
 * preserved — it becomes the sheet's column G verbatim.
 */
const assigneeNamesSchema = z
  .array(z.string().trim().min(1).max(120))
  .max(5)
  .default([])
  .transform((names) => {
    // Same person typed twice (or in two casings) is one assignee, not two join rows.
    const seen = new Set<string>();
    return names.filter((n) => {
      const key = n.trim().toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

const statusSchema = z.enum([
  TicketStatus.OPEN,
  TicketStatus.ONGOING,
  TicketStatus.CLOSED,
]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

/**
 * Encode (M5, FR-1/2/5). The form always sends `employeeName` + `departmentId`; the API
 * resolve-or-creates the employee (M4), so picking an existing match and creating a new
 * reporter are the same request. Defaults to Closed — the department fixes first, records
 * after.
 */
export const encodeTicketSchema = z.object({
  date: isoDate,
  employeeName: z.string().trim().min(1).max(255),
  departmentId: z.string().uuid(),
  mainIssueId: z.string().uuid(),
  concern: z.string().trim().min(1),
  status: statusSchema.default(TicketStatus.CLOSED),
  assignees: assigneeNamesSchema,
  remarks: z.string().trim().max(2000).nullish(),
});
export type EncodeTicketDto = z.infer<typeof encodeTicketSchema>;

/** Field corrections (FR-9). Status/assignment go through their dedicated endpoints. */
export const updateTicketSchema = z
  .object({
    concern: z.string().trim().min(1).optional(),
    remarks: z.string().trim().max(2000).nullish(),
    mainIssueId: z.string().uuid().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "nothing to update" });
export type UpdateTicketDto = z.infer<typeof updateTicketSchema>;

/** Re-assignment (FR-9). Sends the FULL list — an empty array means "unassigned". */
export const assignTicketSchema = z.object({
  assignees: assigneeNamesSchema,
});
export type AssignTicketDto = z.infer<typeof assignTicketSchema>;

export const closeTicketSchema = z.object({
  remarks: z.string().trim().max(2000).nullish(),
});
export type CloseTicketDto = z.infer<typeof closeTicketSchema>;

export interface TicketDto {
  ticketId: string;
  ticketNo: string;
  date: string;
  status: TicketStatus;
  concern: string;
  remarks: string | null;
  employeeId: string;
  employeeName: string | null;
  department: string | null;
  mainIssueId: string;
  mainIssue: string | null;
  /** Ordered; render with `formatAssignees` so the UI and the sheet agree. */
  assignees: TicketAssigneeDto[];
  createdBy: string;
  ongoingAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetailDto extends TicketDto {
  history: AuditEntryDto[];
}

/** List filters (FR-3). Read path — no transaction. */
export const ticketListQuerySchema = z.object({
  status: statusSchema.optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  departmentId: z.string().uuid().optional(),
  mainIssueId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  /** Matches a ticket if this technician is ONE of its assignees. */
  technicianId: z.string().uuid().optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

export interface TicketListResult {
  items: TicketDto[];
  total: number;
}

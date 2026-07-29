import { z } from "zod";
import { TicketStatus } from "../enums.js";
import type { AuditEntryDto } from "./audit.dto.js";

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
  assignedTo: z.string().uuid().nullish(),
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

export const assignTicketSchema = z.object({
  assignedTo: z.string().uuid().nullable(),
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
  assignedTo: string | null;
  assignedToName: string | null;
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
  assignedTo: z.string().uuid().optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

export interface TicketListResult {
  items: TicketDto[];
  total: number;
}

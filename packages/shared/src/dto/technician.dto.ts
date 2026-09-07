import { z } from "zod";

/**
 * Technicians (directory CRUD + inline resolve-or-create) — the IT person who HANDLED a
 * ticket. Deliberately NOT an account (ADR-0017): "Patrick" handled 104 tickets and has
 * never signed in, so requiring a login to record attribution would block encoding on user
 * provisioning. Same shape and the same `normalizeName` dedup as employees.
 */
export const createTechnicianSchema = z.object({
  name: z.string().trim().min(1).max(120),
  /** Optional bridge to an account, for "my tickets". Attribution never needs it. */
  userId: z.string().uuid().nullish(),
});
export type CreateTechnicianDto = z.infer<typeof createTechnicianSchema>;

export const updateTechnicianSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    userId: z.string().uuid().nullish(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "nothing to update" });
export type UpdateTechnicianDto = z.infer<typeof updateTechnicianSchema>;

export interface TechnicianDto {
  technicianId: string;
  name: string;
  userId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A technician attached to a ticket, in the order the encoder typed them. */
export interface TicketAssigneeDto {
  technicianId: string;
  name: string;
}

/**
 * The sheet's column G, and the one string the UI shows in a table cell. Joining with "/"
 * is not cosmetic — it is the exact format the IT team already writes ("Kim/Paul"), and the
 * sync must reproduce it byte-for-byte or every historical row would be rewritten.
 */
export function formatAssignees(assignees: readonly TicketAssigneeDto[]): string | null {
  return assignees.length ? assignees.map((a) => a.name).join("/") : null;
}

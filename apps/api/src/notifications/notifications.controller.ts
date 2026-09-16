import { Controller, Get, Inject } from "@nestjs/common";
import { and, desc, eq, or } from "drizzle-orm";
import { schema, type Db } from "@11ftc/db";
import { DATABASE } from "../database/database.constants.js";

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  tag: string;
}

export interface TicketNotificationItem {
  id: string;
  ticketNo: string;
  title: string;
  status: "OPEN" | "ONGOING" | "CLOSED";
  desc: string;
  time: string;
  department?: string;
  concern?: string;
  createdById?: string;
  creatorName?: string;
}

export interface NotificationsResponse {
  activities: NotificationItem[];
  tickets: TicketNotificationItem[];
}

@Controller({ path: "notifications", version: "1" })
export class NotificationsController {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  @Get()
  async list(): Promise<NotificationsResponse> {
    // 1. Fetch recent administrative actions (Technician, Account, Employee creations)
    const auditRows = await this.db
      .select({
        auditLogId: schema.auditLog.auditLogId,
        fieldName: schema.auditLog.fieldName,
        newValue: schema.auditLog.newValue,
        updatedAt: schema.auditLog.updatedAt,
      })
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.action, "CREATE"),
          or(
            eq(schema.auditLog.fieldName, "Technician"),
            eq(schema.auditLog.fieldName, "Account"),
            eq(schema.auditLog.fieldName, "Employee"),
          ),
        ),
      )
      .orderBy(desc(schema.auditLog.updatedAt))
      .limit(6);

    const activities: NotificationItem[] = [];

    if (auditRows.length > 0) {
      for (const a of auditRows) {
        if (a.fieldName === "Technician") {
          activities.push({
            id: a.auditLogId,
            title: "New Technician Introduced",
            desc: `The admin introduce to you our new technician: ${a.newValue}`,
            time: new Date(a.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            tag: "TECHNICIAN",
          });
        } else if (a.fieldName === "Account") {
          activities.push({
            id: a.auditLogId,
            title: "New Account Added",
            desc: `The admin introduce to you our new technician: ${a.newValue}`,
            time: new Date(a.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            tag: "STAFF",
          });
        } else {
          activities.push({
            id: a.auditLogId,
            title: "New Directory Entry",
            desc: `New employee registered: ${a.newValue}`,
            time: new Date(a.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            tag: "DIRECTORY",
          });
        }
      }
    } else {
      // Fallback to recent technicians in directory so user immediately sees introduction
      const recentTechs = await this.db
        .select({
          technicianId: schema.technicians.technicianId,
          name: schema.technicians.name,
          createdAt: schema.technicians.createdAt,
        })
        .from(schema.technicians)
        .orderBy(desc(schema.technicians.createdAt))
        .limit(3);

      for (const t of recentTechs) {
        activities.push({
          id: t.technicianId,
          title: "New Technician Introduced",
          desc: `The admin introduce to you our new technician: ${t.name}`,
          time: new Date(t.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          tag: "TECHNICIAN",
        });
      }
    }

    // 2. Fetch recent ticket encodings (created/closed/ongoing)
    const recentTickets = await this.db
      .select({
        ticketId: schema.tickets.ticketId,
        ticketNo: schema.tickets.ticketNo,
        concern: schema.tickets.concern,
        status: schema.tickets.status,
        createdAt: schema.tickets.createdAt,
        ongoingAt: schema.tickets.ongoingAt,
        createdById: schema.tickets.createdBy,
        creatorName: schema.users.fullName,
        departmentName: schema.departments.name,
      })
      .from(schema.tickets)
      .leftJoin(schema.users, eq(schema.tickets.createdBy, schema.users.userId))
      .leftJoin(schema.employees, eq(schema.tickets.employeeId, schema.employees.employeeId))
      .leftJoin(schema.departments, eq(schema.employees.departmentId, schema.departments.departmentId))
      .orderBy(desc(schema.tickets.createdAt))
      .limit(8);

    const tickets: TicketNotificationItem[] = recentTickets.map((t) => {
      const isClosed = t.status === "Closed";
      const isOngoing = t.status === "Ongoing";
      const statusUpper: "OPEN" | "ONGOING" | "CLOSED" = isClosed
        ? "CLOSED"
        : isOngoing
        ? "ONGOING"
        : "OPEN";

      const timeStr = t.createdAt
        ? new Date(t.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Recent";

      return {
        id: t.ticketId,
        ticketNo: t.ticketNo,
        title: t.ticketNo,
        status: statusUpper,
        desc: t.concern,
        time: timeStr,
        department: t.departmentName ?? "General",
        concern: t.concern,
        createdById: t.createdById,
        creatorName: t.creatorName ?? "Technician",
      };
    });

    return { activities, tickets };
  }
}

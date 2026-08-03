import { Module } from "@nestjs/common";
import { TicketService } from "./ticket.service.js";
import { TicketController } from "./ticket.controller.js";
import { TicketRepository } from "./ticket.repository.js";
import { NumberingModule } from "../numbering/numbering.module.js";
import { EmployeeModule } from "../employee/employee.module.js";
import { TechnicianModule } from "../technician/technician.module.js";
import { AuditModule } from "../audit/audit.module.js";
import { OutboxModule } from "../outbox/outbox.module.js";

/**
 * M5 — Ticket Encoding & Lifecycle. TicketService is THE transaction boundary: number,
 * ticket, audit rows, and outbox row commit together or not at all. State machine enforced
 * server-side; Closed is terminal; no delete route. Depends on M3, M4, M6, M7.
 * See .claude/rules/domain.md and docs/implementation/M5-ticket.md.
 */
@Module({
  imports: [NumberingModule, EmployeeModule, TechnicianModule, AuditModule, OutboxModule],
  controllers: [TicketController],
  providers: [TicketService, TicketRepository],
  exports: [TicketService],
})
export class TicketModule {}

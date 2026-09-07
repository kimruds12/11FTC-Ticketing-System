import { Module } from "@nestjs/common";
import { TechnicianService } from "./technician.service.js";
import { TechnicianController } from "./technician.controller.js";

/**
 * Technicians (ADR-0017) — directory CRUD plus the inline `resolveOrCreateMany(names, tx)`
 * used by the encode/assign transactions. Exported so TicketService (M5) can inject it; it
 * never opens its own transaction (.claude/rules/domain.md).
 */
@Module({
  controllers: [TechnicianController],
  providers: [TechnicianService],
  exports: [TechnicianService],
})
export class TechnicianModule {}

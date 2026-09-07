import { Module } from "@nestjs/common";
import { EmployeeService } from "./employee.service.js";
import { EmployeeController } from "./employee.controller.js";

/**
 * M2/M4 — Employees. M2 provides admin directory CRUD (EmployeeController); M4 will add the
 * inline `resolveOrCreate(name, departmentId, tx)` used by the encode form, sharing the same
 * `normalizeName` dedup (M4 invariant 1). Exported so TicketService (M5) can inject it.
 */
@Module({
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}

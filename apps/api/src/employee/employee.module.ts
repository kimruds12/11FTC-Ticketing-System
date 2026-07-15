import { Module } from "@nestjs/common";
import { EmployeeService } from "./employee.service.js";

/**
 * M4 — Employee Resolution. resolveOrCreate(name, departmentId, tx) with normalize() that
 * must exactly compute the stored name_normalized column. Scaffold only — see
 * docs/implementation/M4-employee.md.
 */
@Module({
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}

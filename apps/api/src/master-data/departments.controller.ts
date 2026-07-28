import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  UserRole,
  type CreateDepartmentDto,
  type DepartmentDto,
  type UpdateDepartmentDto,
} from "@11ftc/shared";
import { Roles } from "../auth/roles.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { LookupsService } from "./lookups.service.js";

/**
 * M2 — Department lookup. Reads are open to any authenticated user (dropdowns); writes are
 * admin-only (§3.3). No delete — retire with `is_active`.
 */
@Controller({ path: "departments", version: "1" })
export class DepartmentsController {
  constructor(private readonly lookups: LookupsService) {}

  @Get()
  list(): Promise<DepartmentDto[]> {
    return this.lookups.listDepartments();
  }

  @Post()
  @Roles(UserRole.IT_ADMINISTRATOR)
  create(
    @Body(new ZodValidationPipe(createDepartmentSchema)) dto: CreateDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.lookups.createDepartment(dto);
  }

  @Patch(":id")
  @Roles(UserRole.IT_ADMINISTRATOR)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateDepartmentSchema)) dto: UpdateDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.lookups.updateDepartment(id, dto);
  }
}

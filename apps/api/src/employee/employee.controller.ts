import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  UserRole,
  type CreateEmployeeDto,
  type EmployeeDto,
  type UpdateEmployeeDto,
} from "@11ftc/shared";
import { Roles } from "../auth/roles.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { EmployeeService } from "./employee.service.js";

/**
 * M2 — Employee directory. Listing is open to any authenticated user (the encode form needs
 * it); create/edit/deactivate are admin-only. The inline match-first search (`/search`) and
 * resolve-or-create belong to M4 and are added there.
 */
@Controller({ path: "employees", version: "1" })
export class EmployeeController {
  constructor(private readonly employees: EmployeeService) {}

  /** `includeInactive=true` is for the admin directory — retired people must stay visible
   *  (nothing is deleted, FR-9). The encode form uses the default, active-only. */
  @Get()
  list(@Query("includeInactive") includeInactive?: string): Promise<EmployeeDto[]> {
    return this.employees.list(includeInactive === "true");
  }

  /** M4 — match-first search-as-you-type for the encode form (any authenticated role). */
  @Get("search")
  search(@Query("q") q?: string): Promise<EmployeeDto[]> {
    return this.employees.search(q ?? "");
  }

  @Post()
  @Roles(UserRole.IT_ADMINISTRATOR)
  create(
    @Body(new ZodValidationPipe(createEmployeeSchema)) dto: CreateEmployeeDto,
  ): Promise<EmployeeDto> {
    return this.employees.create(dto);
  }

  @Patch(":id")
  @Roles(UserRole.IT_ADMINISTRATOR)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateEmployeeSchema)) dto: UpdateEmployeeDto,
  ): Promise<EmployeeDto> {
    return this.employees.update(id, dto);
  }
}

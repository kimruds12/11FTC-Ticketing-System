import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createTechnicianSchema,
  updateTechnicianSchema,
  UserRole,
  type CreateTechnicianDto,
  type TechnicianDto,
  type UpdateTechnicianDto,
} from "@11ftc/shared";
import { Roles } from "../auth/roles.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { TechnicianService } from "./technician.service.js";

/**
 * Technician directory (ADR-0017). Listing and search are open to any authenticated user —
 * the encode form needs them, and IT Staff encode tickets. This is the fix for the old
 * behaviour, where assignment read `/users` (admin-only) and so was simply blank for Staff.
 *
 * Create/edit stay admin-only, but they are NOT on the encoding path: a technician typed
 * into the encode form is created inside the encode transaction (M5), so a Staff user can
 * record a new name without an admin round-trip.
 */
@Controller({ path: "technicians", version: "1" })
export class TechnicianController {
  constructor(private readonly technicians: TechnicianService) {}

  @Get()
  list(@Query("includeInactive") includeInactive?: string): Promise<TechnicianDto[]> {
    return this.technicians.list(includeInactive === "true");
  }

  @Get("search")
  search(@Query("q") q?: string): Promise<TechnicianDto[]> {
    return this.technicians.search(q ?? "");
  }

  @Post()
  @Roles(UserRole.IT_ADMINISTRATOR)
  create(
    @Body(new ZodValidationPipe(createTechnicianSchema)) dto: CreateTechnicianDto,
  ): Promise<TechnicianDto> {
    return this.technicians.create(dto);
  }

  @Patch(":id")
  @Roles(UserRole.IT_ADMINISTRATOR)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTechnicianSchema)) dto: UpdateTechnicianDto,
  ): Promise<TechnicianDto> {
    return this.technicians.update(id, dto);
  }
}

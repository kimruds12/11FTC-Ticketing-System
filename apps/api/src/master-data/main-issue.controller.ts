import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  createMainIssueSchema,
  updateMainIssueSchema,
  UserRole,
  type CreateMainIssueDto,
  type MainIssueDto,
  type UpdateMainIssueDto,
} from "@11ftc/shared";
import { Roles } from "../auth/roles.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { LookupsService } from "./lookups.service.js";

/**
 * M2 — Main-issue category lookup. Reads open to any authenticated user (encode-form
 * dropdown); writes admin-only. No delete — retire with `is_active`.
 */
@Controller({ path: "main-issues", version: "1" })
export class MainIssuesController {
  constructor(private readonly lookups: LookupsService) {}

  @Get()
  list(): Promise<MainIssueDto[]> {
    return this.lookups.listMainIssues();
  }

  @Post()
  @Roles(UserRole.IT_ADMINISTRATOR)
  create(
    @Body(new ZodValidationPipe(createMainIssueSchema)) dto: CreateMainIssueDto,
  ): Promise<MainIssueDto> {
    return this.lookups.createMainIssue(dto);
  }

  @Patch(":id")
  @Roles(UserRole.IT_ADMINISTRATOR)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMainIssueSchema)) dto: UpdateMainIssueDto,
  ): Promise<MainIssueDto> {
    return this.lookups.updateMainIssue(id, dto);
  }
}

import { Module } from "@nestjs/common";
import { GoTrueModule } from "../auth/gotrue.module.js";
import { UsersService } from "./users.service.js";
import { UsersController } from "./users.controller.js";
import { LookupsService } from "./lookups.service.js";
import { DepartmentsController } from "./departments.controller.js";
import { MainIssuesController } from "./main-issue.controller.js";

/**
 * M2 — Master Data. Two distinct surfaces:
 *   • System Users — accounts with a role, provisioned WITH their credentials (ADR-0018,
 *     superseding ADR-0013), via GoTrueModule.
 *   • Lookups — departments + main-issue categories (Departments/MainIssues controllers).
 * Employee DIRECTORY CRUD lives in the EmployeeModule (M4 folder), sharing normalizeName.
 * is_active everywhere; nothing is deleted. Lookup contents are OPEN-4 (from the IT team).
 */
@Module({
  imports: [GoTrueModule],
  controllers: [UsersController, DepartmentsController, MainIssuesController],
  providers: [UsersService, LookupsService],
  exports: [UsersService, LookupsService],
})
export class MasterDataModule {}

import { Module } from "@nestjs/common";
import { MasterDataService } from "./master-data.service.js";

/**
 * M2 — Master Data. Department, MainIssueCategory, User, Employee CRUD. is_active
 * everywhere; nothing is deleted. Lookup contents are OPEN-4 (from the IT team).
 * Scaffold only — see docs/implementation/M2-master-data.md.
 */
@Module({
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}

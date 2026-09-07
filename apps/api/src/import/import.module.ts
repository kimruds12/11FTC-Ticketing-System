import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../database/database.module.js";
import { SheetImportService } from "./sheet-import.service.js";

// Load the repo-root .env (cwd is apps/api; at runtime this file is dist/import/*).
const rootEnv = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..", ".env");

/**
 * M10 — the one-time importer (ADR-0015). Booted ONLY by `main.import.ts`, never imported by
 * `AppModule` or `WorkerModule`: no HTTP route and no queue job may reach this code, which is
 * what keeps FR-25 true for the running system.
 *
 * Delete this module after go-live.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: [rootEnv] }), DatabaseModule],
  providers: [SheetImportService],
})
export class ImportModule {}

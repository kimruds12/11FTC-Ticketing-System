import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller.js";
import { validateEnv } from "./config/env.js";
import { DatabaseModule } from "./database/database.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { MasterDataModule } from "./master-data/master-data.module.js";
import { NumberingModule } from "./numbering/numbering.module.js";
import { EmployeeModule } from "./employee/employee.module.js";
import { TechnicianModule } from "./technician/technician.module.js";
import { TicketModule } from "./ticket/ticket.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { OutboxModule } from "./outbox/outbox.module.js";
import { AnalyticsModule } from "./analytics/analytics.module.js";

/**
 * The HTTP application module. Each imported module maps 1:1 to M1..M9 in
 * docs/14-module-specifications.md. The SyncWorkerModule (M8) is intentionally NOT here —
 * it runs in the worker process (main.worker.ts), not in the HTTP API.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // Cloud deployments (Railway) inject env vars directly into process.env — no .env
      // file exists at runtime. Only load the file in local / non-production mode where
      // the repo-root .env is the source of truth. The root is three dirs up from the
      // compiled dist/app.module.js: apps/api/dist → apps/api → apps → (root).
      ...(process.env["NODE_ENV"] !== "production" && {
        envFilePath: [resolve(dirname(fileURLToPath(import.meta.url)), "../../..", ".env")],
      }),
    }),
    DatabaseModule,
    AuthModule, // M1
    MasterDataModule, // M2
    NumberingModule, // M3
    EmployeeModule, // M4 — reporters
    TechnicianModule, // M4 — handlers (ADR-0017), same resolve-or-create shape
    TicketModule, // M5 — the transaction boundary
    AuditModule, // M6
    OutboxModule, // M7
    AnalyticsModule, // M9
  ],
  controllers: [AppController], // version-neutral /api/health and /api/version
})
export class AppModule {}

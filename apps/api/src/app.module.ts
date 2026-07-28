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
      // Load the repo-root .env: the process cwd is apps/api (pnpm --filter), and at
      // runtime this file is apps/api/dist/app.module.js, so the root is three up.
      envFilePath: [resolve(dirname(fileURLToPath(import.meta.url)), "../../..", ".env")],
    }),
    DatabaseModule,
    AuthModule, // M1
    MasterDataModule, // M2
    NumberingModule, // M3
    EmployeeModule, // M4
    TicketModule, // M5 — the transaction boundary
    AuditModule, // M6
    OutboxModule, // M7
    AnalyticsModule, // M9
  ],
  controllers: [AppController], // version-neutral /api/health and /api/version
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule, // M1
    MasterDataModule, // M2
    NumberingModule, // M3
    EmployeeModule, // M4
    TicketModule, // M5 — the transaction boundary
    AuditModule, // M6
    OutboxModule, // M7
    AnalyticsModule, // M9
  ],
})
export class AppModule {}

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "../database/database.module.js";
import { OutboxRepository } from "./outbox.repository.js";
import { SheetsClient } from "./sheets.client.js";
import { SyncService } from "./sync.service.js";
import { SyncProcessor, SYNC_QUEUE } from "./sync.processor.js";

// Load the repo-root .env (worker cwd is apps/api; at runtime this file is dist/sync/*).
const rootEnv = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..", ".env");

/**
 * M8 — the SEPARATE worker process (booted by main.worker.ts, NOT imported by AppModule).
 * Needs Redis (BullMQ) + Google Sheets credentials to run; until both are configured (the
 * Docker/Redis setup), it simply won't start — and encoding is unaffected, since outbox rows
 * stay PENDING and are drained once the worker comes up. See docs/deployment.md.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [rootEnv] }),
    DatabaseModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>("REDIS_URL") ?? "redis://localhost:6379");
        return {
          connection: { host: url.hostname, port: Number(url.port) || 6379 },
        };
      },
    }),
    BullModule.registerQueue({ name: SYNC_QUEUE }),
  ],
  providers: [SyncService, OutboxRepository, SheetsClient, SyncProcessor],
})
export class WorkerModule {}

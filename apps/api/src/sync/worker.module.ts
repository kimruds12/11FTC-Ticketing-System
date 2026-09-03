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

// Load the repo-root .env in non-production only. Cloud deployments (Railway) inject
// env vars directly into process.env; the file does not exist and the path resolution
// would throw. In local dev, the file must be loaded because the worker runs in a
// sub-process (cwd: apps/api) that does not inherit Next.js's env loading.
const rootEnv =
  process.env["NODE_ENV"] !== "production"
    ? resolve(dirname(fileURLToPath(import.meta.url)), "../../../..", ".env")
    : undefined;

/**
 * M8 — the SEPARATE worker process (booted by main.worker.ts, NOT imported by AppModule).
 * Needs Redis (BullMQ) + Google Sheets credentials to run; until both are configured (the
 * Docker/Redis setup), it simply won't start — and encoding is unaffected, since outbox rows
 * stay PENDING and are drained once the worker comes up. See docs/deployment.md.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ...(rootEnv ? { envFilePath: [rootEnv] } : {}),
    }),
    DatabaseModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const rawUrl = config.get<string>("REDIS_URL") ?? "redis://localhost:6379";
        const url = new URL(rawUrl);
        const isTls = url.protocol === "rediss:"; // Upstash uses rediss:// (double-s)
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || (isTls ? 6380 : 6379),
            // Only include username/password when the URL actually contains them.
            // Spreading undefined properties would cause ioredis to attempt auth with
            // empty strings, which most Redis servers reject.
            ...(url.username ? { username: url.username } : {}),
            ...(url.password ? { password: url.password } : {}),
            // Use conditional spread so `tls` is absent (not undefined) when not needed.
            // ioredis treats an absent key and an explicit undefined differently.
            ...(isTls ? { tls: {} } : {}),
          },
        };
      },
    }),
    BullModule.registerQueue({ name: SYNC_QUEUE }),
  ],
  providers: [SyncService, OutboxRepository, SheetsClient, SyncProcessor],
})
export class WorkerModule {}

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SyncService } from "./sync.service.js";

/**
 * M8 — Sync Worker (read side). This is the module booted by main.worker.ts in the
 * SEPARATE worker process — it is deliberately NOT imported by AppModule. Drains PENDING
 * outbox rows to the append-only _raw tab, marks SENT. BullMQ processor + a repeatable
 * sweeper every minute. Locate rows by row_key, never remembered position.
 * Scaffold only — see .claude/rules/sync-worker.md and docs/implementation/M8-sync-worker.md.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [SyncService],
})
export class WorkerModule {}

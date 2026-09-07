import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./sync/worker.module.js";

/**
 * Sync worker entrypoint — same codebase, separate process (System Design §2). Drains the
 * transactional outbox to Google Sheets. Runs a BullMQ processor plus a repeatable
 * sweeper every minute. It must NEVER block encoding: a Sheets outage looks like a
 * backlog of PENDING rows, not a failed ticket save (FR-29).
 *
 * Uses createApplicationContext (no HTTP server) — this process has no routes.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  await app.init();
  console.log("[worker] started — draining sync outbox");
}

void bootstrap();

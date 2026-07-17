import "reflect-metadata";
import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { API_PREFIX, DEFAULT_API_VERSION } from "./common/versioning/index.js";

/**
 * HTTP API entrypoint. All business logic and the single transaction boundary
 * (TicketService) live behind this process. The BullMQ consumer is a SEPARATE process —
 * see main.worker.ts — so Google's latency never enters an HTTP request.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Every route lives under `/api`, then URI-versioned as `/v1` unless a controller
  // overrides its version. Health/version are VERSION_NEUTRAL (no version segment).
  // See docs/api/versioning.md and ADR-0012.
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: DEFAULT_API_VERSION,
  });

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  console.log(`[api] listening on :${port} (prefix /${API_PREFIX}, default v${DEFAULT_API_VERSION})`);
}

void bootstrap();

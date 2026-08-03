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

  // Fire onApplicationShutdown (DatabaseModule closes the pg pool) on SIGINT/SIGTERM.
  app.enableShutdownHooks();

  // CORS — required for anything the BROWSER calls directly: the dashboard's live analytics
  // and the employee/technician pickers. Server Components reach the API server-to-server and
  // never needed it, which is exactly why its absence was so hard to see: the blocked request
  // never reaches Nest, so nothing is logged here and the page simply renders empty.
  //
  // An explicit allowlist, not `*`. These routes are authenticated with a bearer token, and a
  // wildcard origin would let any site issue credentialed calls for a signed-in user.
  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  });

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
  console.log(`[api] CORS origins: ${origins.join(", ")}`);
}

void bootstrap();

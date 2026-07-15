import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

/**
 * HTTP API entrypoint. All business logic and the single transaction boundary
 * (TicketService) live behind this process. The BullMQ consumer is a SEPARATE process —
 * see main.worker.ts — so Google's latency never enters an HTTP request.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${port}`);
}

void bootstrap();

import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createDb } from "@11ftc/db";
import type { Env } from "../config/env.js";
import { DATABASE, DB_CONNECTION } from "./database.constants.js";

type Connection = ReturnType<typeof createDb>;

/**
 * Global database module. Opens ONE `pg` Pool over the Supabase session pooler and exposes
 * the Drizzle handle under the `DATABASE` token. `@Global` so every module can inject it
 * without re-importing. The pool is closed on shutdown (needs `app.enableShutdownHooks()`
 * in main.ts).
 *
 * Nothing here opens a transaction — `TicketService` is the single transaction boundary
 * (.claude/rules/domain.md). This module only provides the connection.
 */
@Global()
@Module({
  providers: [
    {
      provide: DB_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Connection =>
        createDb(config.get("DATABASE_URL", { infer: true })),
    },
    {
      provide: DATABASE,
      inject: [DB_CONNECTION],
      useFactory: (conn: Connection) => conn.db,
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DB_CONNECTION) private readonly conn: Connection) {}

  async onApplicationShutdown(): Promise<void> {
    await this.conn.pool.end();
  }
}

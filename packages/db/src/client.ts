/**
 * Postgres connection for the API and worker processes.
 *
 * A normal `pg` Pool over the Supabase SESSION pooler (5432) — NOT the transaction
 * pooler (6543) and NOT supabase-js. A long-running NestJS process needs the session
 * pooler so prepared statements and multi-statement transactions work; FR-31's outbox
 * pattern depends on multi-statement transactions, which PostgREST cannot do.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

export function createDb(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const pool = new Pool({ connectionString, max: 10 });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export type Db = ReturnType<typeof createDb>["db"];

/**
 * A transaction handle — the `tx` passed down from `TicketService` to numbering, audit,
 * and outbox. Nothing below `TicketService` may open its own transaction (see
 * `.claude/rules/domain.md`).
 */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

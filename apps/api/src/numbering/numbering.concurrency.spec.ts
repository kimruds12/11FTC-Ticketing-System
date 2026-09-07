import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { inArray } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Pool } from "pg";
import { createDb, schema, type Db } from "@11ftc/db";
import { NumberingService } from "./numbering.service.js";

/**
 * THE spec for M3 (System Design §3.2). Fire many simultaneous encodes against ONE date and
 * prove every allocated number is distinct — the bug this module prevents is invisible in
 * every manual test and only shows up under real contention, so this runs against a REAL
 * Postgres (a mock cannot prove atomicity under a row lock).
 *
 * Isolated to a far-future test scope we clean up. `ticket_sequence` is NOT `tickets` or
 * `audit_log`, so DELETE here does not touch the no-delete rule.
 */
process.loadEnvFile?.(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../..", ".env"),
);

const TEST_DATE = new Date("2099-01-15T00:00:00Z");
const TEST_SCOPE_KEYS = ["2099", "2099-01-15"];
const CONCURRENCY = 50;

let db: Db;
let pool: Pool;

async function cleanScopes(): Promise<void> {
  await db
    .delete(schema.ticketSequence)
    .where(inArray(schema.ticketSequence.scopeKey, TEST_SCOPE_KEYS));
}

beforeAll(async () => {
  const conn = createDb(process.env.DATABASE_URL);
  db = conn.db;
  pool = conn.pool;
  await cleanScopes();
});

afterAll(async () => {
  if (db) await cleanScopes();
  if (pool) await pool.end();
});

describe("M3 ticket numbering", () => {
  it(`${CONCURRENCY} concurrent encodes, one date → ${CONCURRENCY} distinct numbers`, async () => {
    const numbering = new NumberingService("year");

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        db.transaction((tx) => numbering.next(TEST_DATE, tx)),
      ),
    );

    const numbers = results.map((r) => r.sequenceNumber);
    // The guarantee: no two encodes get the same number.
    expect(new Set(numbers).size).toBe(CONCURRENCY);
    // From a clean scope the counter is contiguous 1..N.
    expect([...numbers].sort((a, b) => a - b)).toEqual(
      Array.from({ length: CONCURRENCY }, (_, i) => i + 1),
    );
    // All derive their scope from the ENCODED date, not today.
    expect(results.every((r) => r.sequenceScope === "2099")).toBe(true);
  });

  it("backdating uses the encoded date's scope, not today's", async () => {
    await cleanScopes();
    const numbering = new NumberingService("year");
    const r = await db.transaction((tx) => numbering.next(TEST_DATE, tx));
    expect(r.sequenceScope).toBe("2099");
    expect(r.ticketNo).toBe("IT-2099-0001");
  });

  it("a forced rollback consumes no number and never duplicates", async () => {
    await cleanScopes();
    const numbering = new NumberingService("year");

    const a = await db.transaction((tx) => numbering.next(TEST_DATE, tx)); // committed

    await expect(
      db.transaction(async (tx) => {
        await numbering.next(TEST_DATE, tx); // allocated, then abandoned
        throw new Error("forced rollback");
      }),
    ).rejects.toThrow("forced rollback");

    const c = await db.transaction((tx) => numbering.next(TEST_DATE, tx)); // committed

    expect(a.sequenceNumber).toBe(1);
    // The rolled-back allocation is undone — its number is reused, never duplicated.
    expect(c.sequenceNumber).toBe(2);
    expect(c.sequenceNumber).not.toBe(a.sequenceNumber);
  });

  it("formats date- and year-scoped numbers correctly", async () => {
    await cleanScopes();
    const dateScoped = await db.transaction((tx) =>
      new NumberingService("date").next(TEST_DATE, tx),
    );
    expect(dateScoped.sequenceScope).toBe("2099-01-15");
    expect(dateScoped.ticketNo).toBe("IT-2099-0115-001");

    await cleanScopes();
    const yearScoped = await db.transaction((tx) =>
      new NumberingService("year").next(TEST_DATE, tx),
    );
    expect(yearScoped.sequenceScope).toBe("2099");
    expect(yearScoped.ticketNo).toBe("IT-2099-0001");
  });
});

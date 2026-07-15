import { describe, it, expect } from "vitest";

/**
 * THE test that is the specification for M3 (System Design §3.2, module spec M3).
 *
 * Fire 50 simultaneous encodes against ONE date and assert 50 DISTINCT ticket numbers.
 * This is why the numbering module exists; it fails in production the first busy morning
 * and passes every manual test. Write it before writing M3 — the test is the spec, not a
 * check on it.
 *
 * STUB: fails loudly until M3 exists. Do NOT make it pass by weakening it. Replace the
 * body with the real thing:
 *
 *   1. spin up NumberingService against a real Postgres (session pooler)
 *   2. Promise.all of 50 encodes, each opening its own transaction, same date
 *   3. collect the 50 sequence_numbers
 *   4. expect(new Set(numbers).size).toBe(50)
 *
 * Also cover (module spec M3): backdating uses that date's scope; a forced rollback after
 * allocation skips a number without duplicating; flipping date↔year scope formats
 * correctly.
 */
describe("M3 ticket numbering — 50 concurrent encodes, one date", () => {
  it.todo("allocates 50 distinct sequence numbers under contention");

  it("is not yet implemented — this gate must stay RED until M3 lands", () => {
    // Intentional failure so CI's test:concurrency step is loud, not silently green.
    expect.fail(
      "M3 not implemented. Implement NumberingService and replace this stub with the real 50-way concurrency test.",
    );
  });
});

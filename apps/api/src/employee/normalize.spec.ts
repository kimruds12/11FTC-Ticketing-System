import { describe, it, expect } from "vitest";
import { normalizeName } from "@11ftc/shared";

/**
 * M4 invariant 1 — the dedup guarantee. `normalizeName` is the single function that computes
 * `employees.name_normalized`, shared by the M2 admin-create path and the M4 inline path.
 * If these variants don't collapse to one canonical form, the unique index can't stop
 * near-duplicate employees.
 */
describe("normalizeName", () => {
  it("collapses case, surrounding, and internal whitespace to one canonical form", () => {
    const variants = [
      "Juan Dela Cruz",
      "juan dela cruz",
      "Juan  Dela  Cruz",
      "  Juan Dela Cruz  ",
      "JUAN DELA CRUZ",
    ];
    const normalized = variants.map(normalizeName);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("juan dela cruz");
  });

  it("keeps genuinely different names distinct", () => {
    expect(normalizeName("Juan Dela Cruz")).not.toBe(normalizeName("Juana Dela Cruz"));
  });
});

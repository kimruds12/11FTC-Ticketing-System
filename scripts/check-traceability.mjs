#!/usr/bin/env node
// Requirements <-> design alignment guard. Fails the build if:
//   1. any FR-n defined in the SRS is not present in the traceability matrix, or
//   2. any relative markdown link in the matrix points at a file that does not exist.
//
// This is what keeps requirements and design from silently drifting apart as both evolve —
// a new FR with no traceability row, or a renamed/deleted doc, breaks CI.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const SRS = resolve(root, "docs/11FTC_SRS_Rev3.md");
const MATRIX = resolve(root, "docs/12-traceability-matrix.md");

const problems = [];

// --- 1. FR coverage ---
const frInSrs = new Set((readFileSync(SRS, "utf8").match(/FR-\d+/g) ?? []));
const matrixText = readFileSync(MATRIX, "utf8");
const frInMatrix = new Set((matrixText.match(/FR-\d+/g) ?? []));

const byNum = (a, b) => Number(a.slice(3)) - Number(b.slice(3));
const uncovered = [...frInSrs].filter((fr) => !frInMatrix.has(fr)).sort(byNum);
if (uncovered.length) {
  problems.push(`SRS requirements missing from the traceability matrix: ${uncovered.join(", ")}`);
}
if (!frInSrs.size) problems.push("No FR-n IDs found in the SRS — check the SRS path.");

// --- 2. Link integrity (relative .md links in the matrix must resolve) ---
const matrixDir = dirname(MATRIX);
for (const m of matrixText.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)) {
  const target = m[1];
  if (/^https?:\/\//.test(target)) continue;
  if (!existsSync(resolve(matrixDir, target))) {
    problems.push(`Broken doc link in traceability matrix: ${target}`);
  }
}

if (problems.length) {
  console.error("✗ requirements/design traceability check failed:\n");
  problems.forEach((p) => console.error("  " + p));
  process.exit(1);
}
console.log(`✓ traceability OK — ${frInSrs.size} FRs covered, all matrix doc links resolve`);

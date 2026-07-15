#!/usr/bin/env node
// FR-9 / FR-35: nothing is ever deleted. This guard fails the build if any DELETE
// against `tickets` or `audit_log` appears in the codebase, in SQL or in a query
// builder call. Prose can't enforce this; the pipeline does.
//
// Scans apps/ and packages/ source. Skips this file, tests may opt out with the marker
// `// allow-delete-scan-skip` on the same line (used only where a delete is provably
// against a scratch/temp table, never tickets or audit_log).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const roots = ["apps", "packages"].map((d) => resolve(root, d));
const exts = new Set([".ts", ".tsx", ".sql", ".js", ".mjs"]);
const skipDirs = new Set(["node_modules", "dist", ".next", ".turbo", "coverage", "migrations"]);

// Match: DELETE FROM tickets|audit_log  (SQL)  and  .delete(tickets|auditLog)  (Drizzle)
const patterns = [
  /delete\s+from\s+["'`]?(tickets|audit_log)\b/i,
  /\.delete\s*\(\s*(tickets|auditLog|audit_log)\b/i,
];

const offenders = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (!skipDirs.has(name)) walk(full);
    } else if (exts.has(extname(name))) {
      const lines = readFileSync(full, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        if (line.includes("allow-delete-scan-skip")) return;
        if (patterns.some((p) => p.test(line))) {
          offenders.push(`${full}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

for (const r of roots) walk(r);

if (offenders.length) {
  console.error("✗ FR-9/FR-35 violation — DELETE against tickets/audit_log is forbidden:\n");
  offenders.forEach((o) => console.error("  " + o));
  console.error("\nTickets and audit rows are never deleted. Correct by editing; use is_active/status.");
  process.exit(1);
}
console.log("✓ no forbidden DELETE against tickets/audit_log");

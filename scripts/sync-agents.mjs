#!/usr/bin/env node
// Regenerates agent-instruction files from the canonical CLAUDE.md so that no two
// coding agents can drift apart. Run `pnpm sync:agents` to write; CI runs
// `pnpm check:agents` (--check) which exits non-zero if any copy is stale.
//
// CLAUDE.md is canonical. AGENTS.md (Codex and the emerging cross-tool convention) and
// .github/copilot-instructions.md are GENERATED copies with a header banner.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CANONICAL = resolve(root, "CLAUDE.md");

// Each target is a generated copy of CLAUDE.md. AGENTS.md is read by Codex, OpenCode, and
// Antigravity; GEMINI.md by Gemini CLI; copilot-instructions.md by GitHub Copilot.
const targets = [
  { path: resolve(root, "AGENTS.md"), comment: "html" },
  { path: resolve(root, "GEMINI.md"), comment: "html" },
  { path: resolve(root, ".github/copilot-instructions.md"), comment: "html" },
];

const banner = (canonicalName) =>
  `<!-- GENERATED FROM ${canonicalName} — DO NOT EDIT. Run \`pnpm sync:agents\`. -->\n\n`;

const canonical = readFileSync(CANONICAL, "utf8");
const expected = banner("CLAUDE.md") + canonical;

const check = process.argv.includes("--check");
let drifted = false;

for (const t of targets) {
  let current = null;
  try {
    current = readFileSync(t.path, "utf8");
  } catch {
    /* missing counts as drift */
  }
  if (current === expected) continue;

  if (check) {
    drifted = true;
    console.error(`✗ drift: ${t.path} is out of sync with CLAUDE.md`);
  } else {
    mkdirSync(dirname(t.path), { recursive: true });
    writeFileSync(t.path, expected);
    console.log(`✓ wrote ${t.path}`);
  }
}

if (check && drifted) {
  console.error("\nAgent instruction files have drifted. Run `pnpm sync:agents`.");
  process.exit(1);
}
if (check) console.log("✓ agent instruction files are in sync");

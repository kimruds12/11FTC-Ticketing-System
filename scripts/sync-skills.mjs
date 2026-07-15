#!/usr/bin/env node
// Multi-agent skill distribution. The repo-root `skills/`, `agents/`, `references/`, and
// `hooks/` directories are CANONICAL — edit skills there. This script mirrors them into
// each agent's own discovery directory so Claude Code, OpenCode, and Gemini CLI all see
// the same content without relying on symlinks (which don't survive a Windows checkout).
//
//   pnpm sync:skills          regenerate every mirror from canonical
//   pnpm check:skills  (--check)  fail if any mirror has drifted (used in CI)
//
// Codex and Antigravity read the canonical root `skills/` directly via their plugin
// manifests, so they need no mirror.

import { readFileSync, readdirSync, statSync, rmSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(join(fileURLToPath(import.meta.url), "..", ".."));

// canonical dir -> list of mirror dirs (all relative to repo root)
const MIRRORS = {
  skills: [".claude/skills", ".opencode/skills", ".gemini/skills"],
  agents: [".claude/agents"],
  references: [".claude/references"],
  hooks: [".claude/hooks"],
};

const check = process.argv.includes("--check");

function listFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(dir, full).split("\\").join("/"));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out.sort();
}

function diff(srcDir, dstDir) {
  const s = listFiles(srcDir);
  const d = listFiles(dstDir);
  const problems = [];
  const set = new Set(d);
  for (const f of s) {
    if (!set.has(f)) problems.push(`missing: ${f}`);
    else if (readFileSync(join(srcDir, f)) .compare(readFileSync(join(dstDir, f))) !== 0)
      problems.push(`differs: ${f}`);
  }
  for (const f of d) if (!s.includes(f)) problems.push(`extra:   ${f}`);
  return problems;
}

let drifted = false;

for (const [canonical, targets] of Object.entries(MIRRORS)) {
  const srcDir = resolve(root, canonical);
  if (!existsSync(srcDir)) {
    console.error(`✗ canonical source missing: ${canonical}/`);
    process.exit(1);
  }
  for (const rel of targets) {
    const dstDir = resolve(root, rel);
    if (check) {
      const problems = diff(srcDir, dstDir);
      if (problems.length) {
        drifted = true;
        console.error(`✗ ${rel} drifted from ${canonical}/:`);
        problems.forEach((p) => console.error(`    ${p}`));
      }
    } else {
      rmSync(dstDir, { recursive: true, force: true });
      mkdirSync(dstDir, { recursive: true });
      cpSync(srcDir, dstDir, { recursive: true });
      console.log(`✓ ${canonical}/ -> ${rel}`);
    }
  }
}

if (check) {
  if (drifted) {
    console.error("\nSkill mirrors have drifted. Run `pnpm sync:skills`.");
    process.exit(1);
  }
  console.log("✓ all skill mirrors in sync with canonical skills/");
}

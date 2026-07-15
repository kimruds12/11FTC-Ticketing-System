# ADR-0009 — Vendor engineering skills for five agents, canonical + mirrored

**Status:** Accepted · **Realizes:** engineering-process standards · **See:** `docs/agent-tooling.md`

## Context

The team uses five coding agents (Claude Code, Codex, Antigravity, OpenCode, Gemini CLI).
We want the same engineering standards — spec/plan/TDD/review/security/CI — enforced for
every agent, without each developer installing anything, and without the standards drifting
between agents (a problem the project has been bitten by before).

## Decision

- **Vendor** the addyosmani/agent-skills library into the repo (pinned to a commit), rather
  than relying on per-machine plugin installs.
- Keep **one canonical copy** at the repo root (`skills/`, `agents/`, `references/`,
  `hooks/`) and **mirror** it into each agent's discovery directory with `pnpm sync:skills`.
  Codex and Antigravity read the root directly; Claude/OpenCode/Gemini get mirrors (Windows
  checkouts can't use the upstream symlinks).
- Generate the cross-tool instruction files (`AGENTS.md`, `GEMINI.md`,
  `copilot-instructions.md`) from the canonical `CLAUDE.md` (`pnpm sync:agents`).

## Consequences

- CI enforces no drift (`check:skills`, `check:agents`).
- Vendored skills are **general**; `CLAUDE.md`, `.claude/rules/`, and `docs/` are
  project-specific and win on conflict. Vendored files are never hand-edited — deviations
  go in project rules/docs, keeping the next upstream update a clean re-copy.
- Some content is duplicated across agent dirs (~4 skill copies); the sync guard makes that
  safe and the size is negligible.

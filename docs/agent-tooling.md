# Agent tooling & vendored skills

This repo is configured for **five coding agents** — Claude Code, Codex, Antigravity
(`agy`), OpenCode, and Gemini CLI — all sharing one vendored library of engineering
skills, so every agent enforces the same standards.

## Provenance

| | |
|---|---|
| **Source** | https://github.com/addyosmani/agent-skills (MIT) |
| **Pinned commit** | `98967c45a42b88d6b8fb3a88b7ff6273920763d6` (2026-07-12) |
| **Vendored on** | 2026-07-15 |

## Canonical vs. mirrored — where to edit

**Edit skills in the repo-root canonical dirs only:**

```
skills/       24 SKILL.md files — the single source of truth
agents/       4 subagent personas
commands/     8 slash commands (TOML form)
references/   7 quality checklists
hooks/        session lifecycle hook scripts
plugin.json   plugin manifest
```

Everything else that contains skill content is a **generated mirror** — do not hand-edit
it. `pnpm sync:skills` regenerates the mirrors; `pnpm check:skills` (in CI) fails the
build if any mirror drifts. Mirrors exist because Windows checkouts can't use the symlinks
the upstream repo relies on.

| Mirror | Fed from | For |
|---|---|---|
| `.claude/skills/`, `.claude/agents/`, `.claude/references/`, `.claude/hooks/` | canonical | Claude Code (zero-config project discovery) |
| `.opencode/skills/` | `skills/` | OpenCode |
| `.gemini/skills/` | `skills/` | Gemini CLI |

## How each agent discovers the skills

| Agent | Config in this repo | How it loads them |
|---|---|---|
| **Claude Code** | `.claude/skills`, `.claude/agents`, `.claude/commands` (`.md`), `.claude/rules`, `.claude/hooks`, `.claude/settings.json` | Auto-discovered from `.claude/skills/`. Zero install. SessionStart hook injects the `using-agent-skills` meta-skill (needs `jq`). |
| **Codex** | `.codex-plugin/plugin.json` (→ `./skills`), `.agents/plugins/marketplace.json` | `codex plugin marketplace add <repo-or-clone>`; invoke with `@spec-driven-development`. Slash commands and personas are Claude-only; call the skill directly. |
| **Antigravity (agy)** | `.agents/plugins/marketplace.json`, `plugin.json`, `skills/`, `agents/`, `commands/` | `agy plugin install .` (local clone). Discovers `skills/`, registers personas + the 8 slash commands. Reads `AGENTS.md`. |
| **OpenCode** | root `skills/` + `.opencode/skills/` + `AGENTS.md` | Agent-driven: `AGENTS.md` tells it to route intent to the built-in `skill` tool. No manual commands. |
| **Gemini CLI** | `.gemini/skills/`, `.gemini/commands/*.toml`, `GEMINI.md` | `gemini skills install ./skills` (or use the pre-mirrored `.gemini/skills/`). Slash commands auto-discovered. `GEMINI.md` is persistent context. |

> **Command name caveat:** Antigravity and Gemini use `/planning` (not `/plan`) — `/plan`
> collides with an internal command in both. Claude Code uses `/plan`.

## Cross-tool instruction files (generated from `CLAUDE.md`)

`AGENTS.md` (Codex/OpenCode/Antigravity), `GEMINI.md` (Gemini), and
`.github/copilot-instructions.md` (Copilot) are **generated copies** of the canonical
`CLAUDE.md`. Run `pnpm sync:agents`; CI enforces they stay in sync (`pnpm check:agents`).

## Precedence

Vendored skills are **general** best practices. `CLAUDE.md`, `.claude/rules/`, and `docs/`
are **project-specific and win on conflict**. Never edit a vendored file to fit this
project — encode deviations in `.claude/rules/` or the relevant `docs/` file. That keeps
the next upstream update a clean re-copy, not a merge conflict.

## Updating from upstream

```bash
git clone https://github.com/addyosmani/agent-skills.git /tmp/agent-skills
# re-copy skills/ agents/ commands/ references/ hooks/ and the .*-plugin dirs,
# bump the pinned commit above, then:
pnpm sync:skills && pnpm sync:agents
pnpm check:skills && pnpm check:agents
```

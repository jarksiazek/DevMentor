# 2026-10-13 — Add open-mercato agent skills

## Goal
Commit the installed `open-mercato/skills` collection on a branch and open a PR.

## Specs referenced
None (tooling only; no application code, schema or architecture change).

## Key decisions
- Skills are stored once in `.agents/skills/`; `.claude/skills/` and `.grok/skills/` hold relative symlinks to them.
- `skills-lock.json` pins each skill's source and content hash.

## Files changed
- `.agents/skills/**` (345 Markdown files, 1 shell script, 1 YAML file)
- `.claude/skills/*`, `.grok/skills/*` (symlinks)
- `skills-lock.json`

## Commands / results
- No typecheck, lint, test or build runs: nothing under `packages/*` changed, and the new files are Markdown, YAML and shell, which ESLint and Vitest don't cover.

## Follow-ups
- Run `om-setup-agent-pipeline` to create `.ai/agentic.config.json` before using the pipeline skills.

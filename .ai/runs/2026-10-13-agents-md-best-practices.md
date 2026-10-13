# Run: Distill Boris Cherny's best practices into AGENTS.md

- **Date**: 2026-10-13
- **Goal**: Distill Boris Cherny's (Claude Code creator) CLAUDE.md / agent-workflow best practices and include them in `AGENTS.md`.
- **Spec**: none (documentation-only change, trivial scope).

## Sources

- https://howborisusesclaudecode.com (compilation of Boris Cherny's public tips). WebSearch unavailable in this environment; relied on that page.

## Key decisions

- Kept only practices an agent can act on inside the repo (verification loops, compounding corrections, context minimalism, delegation-style task framing, subagents, pruning). Dropped human/tooling-only tips (worktree counts, CLI flags, env vars, `/memory`, GitHub Action setup).
- Mapped "update CLAUDE.md after every mistake" onto the existing `.ai/lessons.md` mechanism instead of creating a parallel one.
- Mapped "plan first" onto the existing spec-driven flow in `.ai/specs/`.
- Left the auto-generated Next.js block at the top of `AGENTS.md` untouched.

## Files changed

- `AGENTS.md` — new "Working practices" section.
- `.ai/runs/2026-10-13-agents-md-best-practices.md` — this log.

## Commands / tests

- None needed (docs only).

## Open issues / follow-ups

- Source page is a third-party compilation; re-check against Boris's original posts if precision matters.

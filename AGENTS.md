<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# `.ai` metadata structure (MANDATORY)

All AI-agent working metadata lives in `.ai/`. Agents MUST follow this structure and naming strategy.

```
.ai/
├── specs/                  # Specifications for Spec-Driven Development (SDD)
│   ├── YYYY-MM-DD-slug.md  # Active specs (not yet implemented)
│   ├── implemented/        # Specs whose implementation is complete
│   └── archive/            # Obsolete, superseded or abandoned specs
├── runs/                   # Logs of autonomous AI runs
│   └── YYYY-MM-DD-slug.md
├── lessons.md              # Index of lessons learned (long-term memory)
└── lessons/                # Detailed lessons: YYYY-MM-DD-slug.md
```

## Naming strategy

Every file in `specs/`, `runs/` and `lessons/` is named `YYYY-MM-DD-slug.md`: the creation date, then a short lowercase kebab-case slug (e.g. `2026-10-13-user-onboarding.md`). Do not rename a file after creation, except to move it between spec folders.

## Specs (`.ai/specs/`)

- Specs are the source of truth. For non-trivial features, find or write a spec **before** implementing; if one exists, follow it and do not silently deviate — update the spec instead.
- New specs go in `.ai/specs/` root. When implementation is complete, move the spec to `implemented/`. Move specs that are obsolete or superseded to `archive/`.
- Use `git mv` when moving specs so history is preserved.

## Runs (`.ai/runs/`)

- Every autonomous AI run MUST write a log to `.ai/runs/YYYY-MM-DD-slug.md`.
- A log records: the goal/task, specs referenced, key decisions, files changed, commands/tests run and their results, and open issues or follow-ups.
- Create the log at the start of the run and update it as work progresses; do not reconstruct it afterwards.

## Lessons (`.ai/lessons.md` and `.ai/lessons/`)

- Read `.ai/lessons.md` at the start of a task.
- After fixing a bug, or when you learn something worth keeping long-term (pitfall, convention, improvement), add an entry to `.ai/lessons.md`. Put longer write-ups in `.ai/lessons/YYYY-MM-DD-slug.md` and link them from the index.
- Keep entries concise and actionable; update or remove entries that become wrong.

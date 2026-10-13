# Run: DevMentor monorepo bootstrap

- **Date**: 2026-10-13
- **Goal**: Initialise the DevMentor monorepo (Next.js + TS + React, PostgreSQL + MikroORM, Awilix DI, Tailwind for frontend, shadcn-ui for backend), write AGENTS.md with the stack assumptions, update README.md with architecture notes.
- **Spec**: `.ai/specs/2026-10-13-monorepo-foundation.md`

## Notes / decisions

- User prompt was truncated after "app package - which is the main, integration package for h…". Chose minimum package set: `app`, `core`, `db`, `ui`. Flagged to user.
- Package manager: npm workspaces (repo already npm; preview runs `npm run dev`).
- TypeScript pinned to `~6.0.3`: typescript-eslint peer range is `<6.1.0`, TS 7 unsupported.
- `@mikro-orm/core` is in Next's default `serverExternalPackages` list.
- Turbopack transpiles workspace packages automatically → packages export TS source (no build step).

## Progress

- Resumed 2026-10-13: previous attempt only left this log; spec and code were missing. Wrote spec `.ai/specs/2026-10-13-monorepo-foundation.md`.
- Moved Next app to `packages/app` (cp + rm: `git mv` fails across devices in this sandbox). Removed starter-only files (backdrop, page.module.css, svgs).
- Root `package.json` → npm workspaces; `dev` script ends with `--` so `npm run dev -- --hostname … --port …` from `openmercato.toml` reaches `next dev`.
- `@devmentor/db`: MikroORM 7.2.5 with `defineEntity` (no decorators). CLI needs a TS loader → added `tsx`, configured via `"mikro-orm"` key in package.json. Env loaded from repo root via `@next/env`.
- Initial migration `Migration20261013111929` (users table) generated.
- **INCIDENT**: the sandbox shell exports `DATABASE_URL` → pre-existing `open-mercato` DB. `.env` does not override it, so the first `db:migration:create --initial` + `db:migrate` ran against `open-mercato` (likely created `users` + `mikro_orm_migrations` there). Inspection was blocked by permissions; did NOT touch it further. Reported to user. Lesson recorded. All later DB commands use explicit `DATABASE_URL=…127.0.0.1:5433/devmentor` (temp cluster in /tmp/devmentor-pg).
- Verified migrate against temp DB: `users` and `mikro_orm_migrations` created.
- `@devmentor/core`: Awilix 13 container (PROXY, strict), `orm` value, scoped `em` fork, `HealthService` (singleton, `select 1` probe, since `checkConnection()` reports "not established" before the first query because the pool is lazy), `UserService` (scoped). Smoke-tested via tsx against the temp DB.
- `@devmentor/ui`: hand-written `components.json` + shadcn theme CSS; `shadcn add button card badge table`. CLI needed a `hooks` export and rewrote `cn` import to npm `cn` → fixed imports, removed the dependency.
- `@devmentor/app`: route groups `(frontend)` (Tailwind) and `(backend)/backend` (shadcn), separate root layouts; `/api/health`; `withRequestScope`. `/backend` uses `await connection()`.
- `next.config.ts`: `loadEnvConfig(repoRoot, …, forceReload=true)`. Verified that forceReload is required. `serverExternalPackages` for the MikroORM 7/kysely stack.
- Sandbox `NODE_ENV=development` breaks `next build` → build with `env -u NODE_ENV`.
- `next dev` generated `packages/app/AGENTS.md` + `CLAUDE.md`; kept them, plus a pointer to the root AGENTS.md.
- Docs: AGENTS.md "DevMentor: stack and architecture" section (placed after the generated Next block); README rewritten with architecture notes.

## Commands / results

- `npm run typecheck`: pass (all 4 workspaces). `npm run lint`: pass, 0 warnings.
- `env -u NODE_ENV npm run build`: pass (`/` static; `/backend`, `/api/health` dynamic).
- `npm run start` (port 3100) with `.env.local` → temp DB: `/api/health` 200 `{status: ok}`, `/backend` shows Connected + users.
- `npm run dev -- --hostname 0.0.0.0 --port 3200` (openmercato preview form): `/`, `/backend`, `/api/health` all 200; backend CSS contains shadcn theme utilities.
- `db:migration:create --initial`, `db:migrate`: pass against temp DB (after the incident above).
- No visual/browser check (no headless browser in sandbox).

## Open issues / follow-ups

- **User action**: review the `open-mercato` DB (shell `DATABASE_URL`) for a `users` table and `mikro_orm_migrations` created by the accidental first migrate.
- User prompt truncated: confirm the intended package list beyond `app`.
- Consider `server-only` guard for `@/server/*`, auth for `/backend`, and a test runner.
- Temp PostgreSQL cluster (/tmp/devmentor-pg, port 5433) stopped and removed; `.env`/`.env.local` removed.
- Late fix: MikroORM names the schema snapshot after the DB (`.snapshot-<db>.json`); a `.snapshot-open-mercato.json` had been written, confirming the incident hit that DB. Removed it; pinned `snapshotName: ".snapshot-devmentor-schema"`. Verified against a DB with a different name: migrate OK, `migration:create` → "No changes required". Temp cluster removed again.

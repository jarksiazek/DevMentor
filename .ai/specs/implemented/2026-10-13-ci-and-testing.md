# Spec: CI pipeline, unit coverage and browser integration tests

- **Date**: 2026-10-13
- **Status**: Implemented (2026-10-13)

## Goal

Every pull request is checked automatically: lint, typecheck, unit tests with 100% coverage, a production build, and integration tests that boot the real app against an ephemeral PostgreSQL and drive it with a browser.

## Decisions

| Concern | Choice | Why |
| --- | --- | --- |
| CI | GitHub Actions, `.github/workflows/ci.yml`, on `pull_request` and pushes to `main` | Repository is on GitHub |
| Unit test runner | Vitest + `@vitest/coverage-v8`, replacing `node:test` | `node:test` cannot load `.tsx`, so components and pages could not be covered |
| Component tests | `@testing-library/react` + `@testing-library/user-event` in `jsdom` | De-facto standard; tests behavior through the DOM |
| Coverage gate | 100% lines, branches, functions and statements over `src/**/*.{ts,tsx}` of each package | Owner requirement: every feature fully unit tested |
| Integration DB | `@testcontainers/postgresql` (PostgreSQL 17) | Ephemeral, isolated DB per run |
| Integration browser | `agent-browser` CLI (Vercel Labs), Chrome for Testing | Owner requirement |
| Integration runner | Vitest project `integration`, `npm run test:integration` | One runner for both suites |

This supersedes the "tests use `node:test`" note in `implemented/2026-09-01-engineering-standards.md`.

## Coverage exclusions

Only code that is not hand-written or has no runtime behavior:

- `packages/db/src/migrations/**`: generated, never edited; the integration suite applies them.
- `**/*.test.{ts,tsx}`, `**/*.d.ts`.

Everything else, including the shadcn primitives in `ui/src/components/ui/`, pages, layouts and Route Handlers, is covered.

## Layout

- `vitest.config.ts` (root): one project per package (`core`, `db` in `node`; `ui`, `app` in `jsdom`) plus `integration`. `npm test` runs the unit projects with coverage; `npm run test:integration` runs `integration`.
- Unit tests sit next to the code: `src/**/<name>.test.ts(x)`.
- Integration tests: `packages/app/integration/*.test.ts`, with `globalSetup.ts` that:
  1. starts a `PostgreSqlContainer`, or uses `INTEGRATION_DATABASE_URL` when set (for environments without Docker);
  2. runs `npm run db:migrate` against it;
  3. starts `next start` on a free port from an existing production build (`npm run build` first);
  4. tears everything down afterwards.
- `packages/app/integration/browser.ts`: thin wrapper around the `agent-browser` CLI with an isolated `--session` per test file.

## Integration scope (initial)

- Home page: renders the hero heading, feature cards and the "Open the admin panel" link, and the link navigates to `/admin`.
- Admin panel (`/admin`): header, "Dashboard" heading, the PostgreSQL status card reports **Connected** (proves the app reaches the container DB), and the Users panel **fails closed** with "Authentication required". `next start` runs with `NODE_ENV=production`, where `requireSession` answers 401 until the auth concept exists. Extend this to a CRUD flow once auth lands.

## CI jobs (all on Node 24, `npm ci`)

1. `lint`: `npm run lint`
2. `typecheck`: `npm run typecheck`
3. `unit`: `npm test` (fails below 100% coverage), uploads the coverage report
4. `build`: `npm run build`
5. `integration`: `npm run build`, `agent-browser install --with-deps`, `npm run test:integration` (Docker is available on `ubuntu-latest`)

## Acceptance criteria

- [x] All five CI jobs exist and pass on the PR.
- [x] `npm test` enforces 100% coverage and passes.
- [x] `npm run test:integration` passes locally (via `INTEGRATION_DATABASE_URL`) and in CI (testcontainers).
- [x] `AGENTS.md` makes 100% unit coverage for every new feature mandatory and documents both suites.

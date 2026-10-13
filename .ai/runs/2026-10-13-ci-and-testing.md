# Run: CI pipeline, 100% unit coverage, browser integration tests

- **Goal**: GitHub CI on every PR (build, lint, unit tests, integration tests with testcontainers PostgreSQL + agent-browser); make 100% unit coverage mandatory in `AGENTS.md`; cover existing code 100%; integration tests for the home page and admin panel.
- **Spec**: `.ai/specs/implemented/2026-10-13-ci-and-testing.md`
- **Branch**: `ci/tests-and-coverage`

## Decisions

- Vitest replaces `node:test`: `node:test` cannot load `.tsx`.
- Integration runs against the production build. `next start` means `NODE_ENV=production`, where `requireSession` fails closed, so the admin Users panel is asserted to show "Authentication required". No auth bypass was added.
- No Docker in this sandbox: locally the integration suite uses `INTEGRATION_DATABASE_URL` against a throwaway cluster in `/tmp`. CI uses testcontainers.

## Progress

- Installed Vitest 5, `@vitest/coverage-v8`, jsdom, Testing Library + jest-dom (root); `testcontainers`, `@testcontainers/postgresql`, `agent-browser` (app).
- Root `vitest.config.ts`: projects core/db (node), ui/app (jsdom), integration; `restoreMocks`/`unstubEnvs`/`unstubGlobals`; 100% thresholds. Pitfall: coverage globs are per project root (first attempt reported 0/0). Verified the gate fails a partial run (exit 1).
- Converted the 4 existing `node:test` files (kept `node:assert`, `t.mock` → `vi.spyOn`). Removed per-package `test` scripts; root `test`, `test:watch`, `test:integration`.
- Unit tests written by four parallel subagents (core, db, ui, app), test files only, no source changes. Result: 30 files, 139 tests, 100% statements/branches/functions/lines (384/210/142/356).
- Integration: `packages/app/integration/{globalSetup,browser,home.test,admin.test}.ts`. Verified assertions can fail with a temporary negative copy (deleted).
- Sandbox needed `npx agent-browser install --with-deps` (sudo apt) for Chrome libs. Local DB: throwaway cluster `/tmp/devmentor-it-pg` on 5433 (`devmentor_it`).
- CI: `.github/workflows/ci.yml` with lint, typecheck, unit (coverage artifact), build, integration jobs.
- `AGENTS.md`: Tests row in the stack table, new "Testing (MANDATORY)" section (100% coverage for every change, no ignore comments or exclusions), definition of done. Lessons updated (obsolete `node --test` lesson replaced). Engineering-standards spec note marked superseded. Spec moved to `implemented/`.

## Verification (local)

- `npm run lint` ✅, `npm run typecheck` ✅, `npm test` ✅ (139 tests, 100%), `env -u NODE_ENV npm run build` ✅, `INTEGRATION_DATABASE_URL=… npm run test:integration` ✅ (6 tests).
- Not verified locally: the testcontainers path (no Docker here); covered by the CI `integration` job.

## Follow-ups (found while writing tests, not fixed here)

- `core/src/logger.ts`: `redact` stops at depth 5 and returns deeper values unredacted, so a `password` nested deeper than that is logged in clear text. Security fix + test should flip the current depth-limit test.
- `ui` `CrudForm`: an untouched field is `undefined`, so Zod shows a type error instead of the field message ("Name is required"). Default values to `""`.
- Admin integration test asserts fail-closed (401) because `next start` is production; extend to a CRUD flow when the auth concept lands.

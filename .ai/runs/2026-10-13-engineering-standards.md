# Run: implement engineering standards spec

- **Date**: 2026-10-13
- **Goal**: Implement `.ai/specs/implemented/2026-09-01-engineering-standards.md` in the current monorepo.
- **Specs**: `.ai/specs/implemented/2026-09-01-engineering-standards.md`, `.ai/specs/implemented/2026-10-13-monorepo-foundation.md`

## Decisions (confirmed with user up front)

- Scope: everything in §5 that applies to this repo, **including** `core/src/events` now.
- `/api/users` auth: fail-closed `requireSession` stub (no auth concept yet) with a dev-only bypass when `NODE_ENV !== "production"`; production answers 401.

## Spec vs. repo reconciliation

The spec was written against an older bootstrap. Mapped as follows (spec text updated accordingly):

- `admin/users/page.tsx` → `(backend)/backend/page.tsx`; `withScope` → `withRequestScope`; `force-dynamic` → `await connection()`.
- `cradle.ts`/`services/index.ts`/`base.entity.ts`/`define.ts`/`mentor-profile.entity.ts` don't exist → only `User`/`UserService`/`HealthService` move into concept folders.
- `pino` → tiny local logger with redaction (spec's own "don't add a dependency for 20 lines" rule).
- `docs/product-scope.md` and `.ai/docs/engineering-standards.md` are not in this repo → links point at the spec; product-scope reconciliation left as follow-up.
- ESLint `no-restricted-imports` boundary did not exist yet → added.

## Progress

- Step 1 (concept folders): `git mv` User → `entities/auth/user.entity.ts`, UserService → `services/auth/user.service.ts`, HealthService → `services/health/health.service.ts`, container → `core/src/container/{container,cradle}.ts`; shadcn primitives → `ui/src/components/ui/` (components.json `ui` alias updated). `migration:create` afterwards: "No changes required".
- Step 2 (shared layers): `core/src/http/{errors,envelope,auth,apiHandler,makeCrudRoute}.ts`, `core/src/logger.ts`; `ui/src/backend/{api,forms,tables,feedback}` with per-category `index.ts` (export `./backend/*`). Added `zod` (core, ui); `shadcn add input label`. The CLI again rewrote `cn` to the npm package, so I fixed the imports and uninstalled it.
- Step 3 (reference example): `/api/health` → `apiHandler`; new `/api/users` (`makeCrudRoute`) and `/api/users/[id]` (`makeCrudItemRoute`), admin-only via `requireAdmin`; `/backend` rewritten to a static shell with colocated `SystemStatusCard`/`UsersPanel` client components (apiCall + DataTable + CrudForm, pagination, delete). DTOs via `toUserDto`.
- Steps 4–5: `core/src/events` (EventBus singleton, `auth.user.created`, log subscriber); validators `auth/user-input.schema.ts` + `pagination.schema.ts`, exported via `@devmentor/core/validators/*`.
- ESLint package boundaries (`no-restricted-imports`) added; verified with a probe file (ui → db import is reported).
- Tests: `node:test`, root `npm test`; 18 core tests (apiHandler, makeCrudRoute, auth, events, logger redaction), 4 ui tests (apiCall).
- Docs: AGENTS.md (§3 sections + updated paths, DoD incl. `npm test`), README layout/request flow, spec reconciled and marked implemented, 3 lessons.

## Commands / results

- `npm run typecheck`: pass (4 workspaces). `npm run lint`: pass, 0 problems. `npm test`: 22/22 pass.
- `env -u NODE_ENV npm run build`: pass with no DB reachable. `/backend` is now static (○), `/api/*` dynamic.
- Temp PostgreSQL 17 at `/tmp/devmentor-pg` (127.0.0.1:5433), explicit `DATABASE_URL`: `db:migrate` OK, `db:migration:create` → no changes.
- `next start` (production): `/api/health` 200 envelope; `/api/users` 401 (fails closed); POST without CSRF header 403; `/backend` 200.
- `next dev` (bypass): create 201 (trimmed/lowercased, smuggled `id` ignored), duplicate 409, invalid 422 with fieldErrors, list 200 paginated, `pageSize=1000` 422, read 200, non-UUID 404, update 200, delete 200, read-after-delete 404; `auth.user.created` subscriber logged. DB stopped: health 503 "Database unavailable" (driver message only in server log), users 500 generic.
- Client bundle check: no `awilix`/`MikroORM`/`pg-pool` in `.next/static`; the shared schema + apiCall are present.
- Not checked: in-browser rendering/interaction of `/backend` (no headless browser in sandbox). The SSR HTML returned 200.

## Open issues / follow-ups

- Auth concept (JWT HS256 cookie, bcrypt ≥12, login/register rate limiting) replaces the `requireSession` stub; until then production `/api/users` is 401 and `/backend` shows the error state in production.
- `docs/product-scope.md` (DI-container line) is not in this repo, so it can't be reconciled here.
- Placement of persona route groups vs. `(frontend)`/`(backend)` root layouts: decide in the first persona-page spec.
- With the DB down, non-health routes answer 500. Consider mapping MikroORM connection errors to 503 in `apiHandler`.
- Temp PostgreSQL cluster stopped (data dir `/tmp/devmentor-pg` removed at end of run).

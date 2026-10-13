<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DevMentor: stack and architecture (MANDATORY)

DevMentor is an npm-workspaces monorepo. These decisions are fixed; changing any of them needs a spec in `.ai/specs/` first. Source specs: `.ai/specs/implemented/2026-10-13-monorepo-foundation.md` (stack) and `.ai/specs/implemented/2026-09-01-engineering-standards.md` (naming, layering, security and review rules; read it before adding a domain concept).

## Stack

| Concern | Use | Do not introduce |
| --- | --- | --- |
| Framework | Next.js 16 App Router (Turbopack), React 19, TypeScript strict | Pages Router, other frameworks |
| Database | PostgreSQL | Other databases |
| ORM / migrations | MikroORM 7 (`@mikro-orm/postgresql`, `@mikro-orm/migrations`) | Prisma, Drizzle, raw `pg` pools, `synchronize`-style schema updates |
| Dependency injection | Awilix (`@devmentor/core` container) | Module-level service singletons, other DI libs |
| Frontend (public) pages | Tailwind CSS 4 utilities | CSS-in-JS, other CSS frameworks |
| Admin pages | shadcn-ui components from `@devmentor/ui` | Other component libraries |
| Package manager | npm workspaces (`packages/*`) | pnpm/yarn, nested lockfiles |
| Tests | Vitest + `@vitest/coverage-v8`, Testing Library (`jsdom`); integration: `@testcontainers/postgresql` + `agent-browser` | Jest, `node:test`, Playwright/Cypress runners |

TypeScript is pinned to `~6.0.x` because typescript-eslint supports `<6.1.0`. Do not bump it until typescript-eslint does.

## Packages

| Package | Responsibility | May import |
| --- | --- | --- |
| `packages/app` (`@devmentor/app`) | Main integration package: Next.js routes, pages, Route Handlers, Server Actions, composition with the container | `core`, `db` (types/entities), `ui` |
| `packages/core` (`@devmentor/core`) | Domain services, the Awilix container (`Cradle`, `withRequestScope`), the HTTP layer (`http/`), domain events (`events/`), shared Zod schemas (`validators/`) | `db` |
| `packages/db` (`@devmentor/db`) | MikroORM config, entities, migrations, ORM singleton | — |
| `packages/ui` (`@devmentor/ui`) | shadcn primitives (`components/ui/`), backend building blocks (`backend/`), `cn`, backend theme CSS | — |

- Dependencies point inward: `app → core → db` and `app → ui`. Never import `@devmentor/app` from another package. Only `db` imports `@mikro-orm/*`; `core` stays free of `next`/`react`. ESLint (`no-restricted-imports` in `eslint.config.mjs`) enforces this.
- Client components never import `db` or the `@devmentor/core` entry point. They may import the zod-only schemas from `@devmentor/core/validators/*` and use `import type` from `@devmentor/core`, because type imports are erased.
- New shared code goes in a new `packages/<name>` with `"name": "@devmentor/<name>"`, a `tsconfig.json` extending `../../tsconfig.base.json` and a `typecheck` script. A new package is an architecture change: write a spec first.
- Workspace packages ship TypeScript source (`exports` → `./src/*.ts`) with no build step. Turbopack transpiles them. Inside `db` and `core`, use relative imports with explicit `.ts` extensions so the MikroORM CLI can load them.

## Database (MikroORM)

- Define entities with `defineEntity` + `setClass` in `packages/db/src/entities/<concept>/<name>.entity.ts`, and register each one in `entities/index.ts`. No decorators, no `reflect-metadata`.
- Change the schema only through migrations: edit entities, run `npm run db:migration:create`, review the generated file in `packages/db/src/migrations/`, then `npm run db:migrate`. Commit migrations and never edit one that has been applied.
- Never call `MikroORM.init` yourself. Use `getOrm()`, which keeps one ORM and one connection pool per process. Pool size is set by `DATABASE_POOL_MIN`/`DATABASE_POOL_MAX`.
- Never use the global `orm.em` in request code. Resolve `em` (a per-scope fork) from an Awilix scope.
- Server-only DB packages are listed in `serverExternalPackages` in `packages/app/next.config.ts`. Add any new Node-only DB dependency there.

## Dependency injection (Awilix)

- Register everything explicitly in `packages/core/src/container/container.ts` (no `loadModules` globbing) and add it to the `Cradle` interface in `container/cradle.ts`. Injection mode is `PROXY` and strict mode is on.
- Services are classes in `packages/core/src/services/<concept>/<name>.service.ts` that receive their dependencies through a destructured constructor object (`constructor({ em }: { em: EntityManager })`). They never import other services or the ORM directly. They throw `AppError` subclasses (`core/src/http/errors.ts`) and never build HTTP responses.
- Lifetimes: `SINGLETON` only for stateless things that don't depend on scoped registrations; `SCOPED` for anything using `em`.
- In the app, Route Handlers reach services through `apiHandler`/`makeCrudRoute` (they open the scope themselves). Server Components and Server Actions use `withRequestScope(cradle => …)` from `@/server/container`.
- Pages that read the database must call `await connection()` (from `next/server`) before querying, so they are not prerendered at build time.

## UI and routing

- Public pages live in `packages/app/src/app/(frontend)/` and use plain Tailwind utilities. Their root layout imports `frontend.css`.
- Admin pages live in `packages/app/src/app/(admin)/admin/` (URL `/admin/...`) and use `@devmentor/ui/components/ui/*` and `@devmentor/ui/backend/*`. Their root layout imports `admin.css` (Tailwind plus the shadcn theme). Don't use shadcn components in frontend pages.
- The two groups have separate root layouts, so navigating between them reloads the page. That's intended.
- Add shadcn components from `packages/ui`: `npx shadcn@latest add <component>`. They land in `src/components/ui/` and are never hand-written. Afterwards, check that the new files import `cn` from `@devmentor/ui/lib/utils`. The CLI sometimes rewrites it to the npm package `cn`, which is wrong.
- API endpoints are Route Handlers under `packages/app/src/app/api/<concept>/`.

## Domain concept convention

Domain code is not organized into `modules/`. Each concept (`auth`, `mentors`, `availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, ...) is a same-named sub-folder repeated across the layers that need it:

- `packages/db/src/entities/<concept>/<name>.entity.ts`
- `packages/core/src/services/<concept>/<name>.service.ts` (ports: `<name>.port.ts`, adapters in `adapters/`)
- `packages/core/src/validators/<concept>/<name>-<action>.schema.ts` (shared Zod schemas, used by both the route and the form)
- `packages/app/src/app/api/<concept>/route.ts` (collection) and `api/<concept>/[id]/route.ts` (item), plus the matching pages
- `packages/ui/src/components/<concept>/` for components shared across pages

Create a concept folder only when its first file is added. Never scaffold empty folders. This is a directory convention, not a module runtime: there is no per-concept setup, ACL or auto-discovery. The reference example is the `auth` concept (`User`, `UserService`, `/api/users`, `/admin`).

Event IDs follow `concept.entity.action` in the past tense (e.g. `auth.user.created`). Declare each one in `core/src/events/event-map.ts`, emit it through the `eventBus` cradle singleton after the mutation has been flushed, and wire listeners in `events/subscribers.ts`. Events are in-process only; there is no queue or worker.

## Reusable API & UI layer

Every route and page reuses two shared layers instead of re-implementing fetch, validation, auth or error handling:

- `@devmentor/core` `http/`: `errors.ts` (`AppError` hierarchy), `apiHandler.ts` (CSRF check, request scope, `{ ok, data }` / `{ ok: false, error: { code, message, fieldErrors? } }` envelope, logs unexpected errors and never leaks them), `makeCrudRoute.ts` (`makeCrudRoute` → `{ GET, POST }`, `makeCrudItemRoute` → `{ GET, PUT, DELETE }`, from Zod schemas plus service calls), `auth.ts` (`requireSession`, `requireRole`, `requireAdmin`, `assertOwns`). Workflow endpoints use `apiHandler` directly. Routes never write their own `try/catch`.
- `@devmentor/ui/backend/*`: `api` (`apiCall`/`apiCallOrThrow`, the only sanctioned `fetch()` to `/api/*`; it sends the CSRF header), `forms` (`CrudForm`), `tables` (`DataTable`), `feedback` (`LoadingMessage`, `ErrorMessage`, `EmptyState`).
- Every CRUD route declares `authorize` explicitly (`"public"` or a function). Until the auth concept exists, `requireSession` fails closed: 401 in production, and an identity-less admin session outside production.
- API responses return whitelisted DTOs (e.g. `toUserDto`). Never return entities directly.

Each new reusable component has one designated home:

1. shadcn primitive → `ui/src/components/ui/` (CLI only).
2. Generic, concept-agnostic panel pattern → `ui/src/backend/<category>/`, exported through that category's `index.ts`.
3. Component tied to one concept's domain shape → `ui/src/components/<concept>/`.
4. Used by exactly one page → colocate it next to that `page.tsx` until a second page needs it.

## Environment and commands

- All `.env*` files live in the repo root. `.env.example` documents the variables; copy it to `.env` or `.env.local`. Both Next.js and the MikroORM CLI read them through `@next/env`.
- Shell variables override `.env` files. In this sandbox the shell exports a foreign `DATABASE_URL` and `NODE_ENV=development`, so pass them explicitly, e.g. `DATABASE_URL=… npm run db:migrate` and `env -u NODE_ENV npm run build`. See `.ai/lessons.md`.
- Run these from the repo root: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:watch`, `npm run test:integration`, `npm run db:migration:create`, `npm run db:migrate`, `npm run db:migrate:down`.
- Definition of done for code changes: `npm run typecheck`, `npm run lint`, `npm test` (100% coverage) and `npm run build` pass, plus `npm run test:integration` when pages, routes or the schema change. Schema changes also include a migration that has been applied locally. CI (`.github/workflows/ci.yml`) runs all of these on every pull request and must be green before merging.

## Testing (MANDATORY)

Spec: `.ai/specs/implemented/2026-10-13-ci-and-testing.md`.

- **Every new feature and every change ships with unit tests that keep coverage at 100%** (lines, branches, functions and statements) for all of `packages/*/src`. `npm test` fails below 100%, and so does CI. Never lower the thresholds, add `/* v8 ignore */` comments or widen the coverage `exclude` list to get green; the only exclusions are generated migrations, test files and `.d.ts`. If code cannot be covered, change its design (inject the dependency) instead.
- Tests assert behavior, not just execution. Bug fixes ship with a regression test that fails without the fix.
- Unit tests sit next to the code as `src/**/<name>.test.ts(x)` and run in the Vitest project of their package (`core`, `db`: `node`; `ui`, `app`: `jsdom` with Testing Library and jest-dom). Configuration is in the root `vitest.config.ts`. Mocks are restored after every test.
- Unit tests never touch a real database or network: fake the `em`/services, pass fakes through `createScope`, and use `vi.mock` for `@devmentor/db` or `@mikro-orm/*`.
- Integration tests live in `packages/app/integration/*.test.ts`. `globalSetup.ts` starts PostgreSQL with testcontainers, runs the migrations, starts the production build with `next start`, and provides `inject("baseUrl")`. Drive pages through `openBrowser()` (`integration/browser.ts`, a wrapper around the `agent-browser` CLI). Every new page or user flow adds an integration test.
- Running integration tests locally: `npm run build` first, and Docker for testcontainers. Without Docker, set `INTEGRATION_DATABASE_URL` to a throwaway database that you created. Never point it at a shared one. Chrome comes from `npx agent-browser install` (add `--with-deps` on a fresh Linux).

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

# Working practices (distilled from Boris Cherny's Claude Code tips)

## Verify your own work

- Verification is the single highest-leverage habit. Before calling a task done, close the feedback loop: run the type-checker, linter, tests and — for UI changes — the app itself, and confirm the change actually works.
- If no way to verify exists, add one (a test, a script, a reproducible command) rather than guessing.
- Report results honestly: say what was run, what passed, what failed and what was not checked.

## Compound every correction

- Never just fix a mistake and move on. When you make a mistake, or a human corrects you, record the rule in `.ai/lessons.md` (details in `.ai/lessons/`) in the same change so it never happens again.
- Rules that apply to every task belong in this file; keep situational knowledge in lessons and specs.
- Prune aggressively: delete rules that are outdated, duplicated or no longer prevent real mistakes. A short file that is followed beats a long one that is skimmed.

## Treat tasks like delegated engineering work

- Start from the goal, constraints and acceptance criteria. If any are missing and cannot be inferred from the code, specs or lessons, ask once, up front.
- For non-trivial work, plan before coding (see Specs above); for small, well-defined changes, just do them.
- Once the goal is clear, work autonomously until the acceptance criteria are met and verified.

## Keep context lean

- Read only what the task needs; let the codebase tell you the rest. Do not pre-load whole directories "just in case".
- Delegate broad searches, research and independent sub-tasks to subagents so the main context stays focused, then act on their conclusions.
- Scale effort to the task: most changes need one careful pass, not a panel of reviewers. Reserve multi-agent workflows for large migrations and refactors.

## Make repeated work reusable

- If you do the same multi-step thing more than once, turn it into a committed script, skill or command instead of re-deriving it each time.
- Match existing patterns, naming and idioms; simplify changed code before finishing.

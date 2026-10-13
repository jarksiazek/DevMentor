# DevMentor

DevMentor is a mentoring platform for software developers. This repository is an npm-workspaces monorepo built on Next.js 16, React 19 and TypeScript, with PostgreSQL behind MikroORM and Awilix for dependency injection.

## Getting started

Requirements: Node.js ≥ 22.17, npm, and a PostgreSQL server you can reach.

```bash
npm install
cp .env.example .env          # then point DATABASE_URL at your database
npm run db:migrate            # apply migrations
npm run dev                   # http://localhost:3000
```

- `/`: public frontend (Tailwind CSS)
- `/admin`: admin panel (shadcn-ui)
- `/api/health`: health check. Returns `200` when the database is reachable, `503` otherwise.

Shell environment variables take precedence over `.env` files. If your shell already exports `DATABASE_URL` or `NODE_ENV`, override or unset them, e.g. `env -u NODE_ENV npm run build`.

## Scripts (run from the repo root)

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack). Extra args are passed through: `npm run dev -- --port 3001` |
| `npm run build` / `npm run start` | Production build / server |
| `npm run lint` | ESLint over the whole monorepo |
| `npm run typecheck` | `tsc` in every workspace |
| `npm test` | Unit tests (`node:test`) in every workspace |
| `npm run db:migration:create` | Generate a migration from entity changes |
| `npm run db:migrate` / `npm run db:migrate:down` | Apply / roll back migrations |

## Architecture

### Stack

| Concern | Technology |
| --- | --- |
| Web framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict) |
| Database | PostgreSQL |
| ORM | MikroORM 7: entities via `defineEntity`, migrations, built-in connection pooling |
| Dependency injection | Awilix (PROXY injection mode, strict mode) |
| Public frontend styling | Tailwind CSS 4 |
| Admin backend UI | shadcn-ui (Radix UI + Tailwind) |
| Monorepo | npm workspaces |

### Repository layout

```
.
├── packages/
│   ├── app/    @devmentor/app   Next.js app: the main integration package
│   │   └── src/
│   │       ├── app/(frontend)/        public pages (Tailwind), root layout #1
│   │       ├── app/(admin)/admin/     admin pages (shadcn-ui), root layout #2
│   │       ├── app/api/<concept>/     Route Handlers (apiHandler / makeCrudRoute)
│   │       └── server/container.ts    withRequestScope() for Server Components/Actions
│   ├── core/   @devmentor/core
│   │   └── src/
│   │       ├── container/             Awilix container + Cradle
│   │       ├── services/<concept>/    domain services
│   │       ├── validators/<concept>/  Zod schemas shared by routes and forms
│   │       ├── http/                  errors, apiHandler, makeCrudRoute, auth
│   │       └── events/                typed in-process event bus
│   ├── db/     @devmentor/db    MikroORM config, entities/<concept>/, migrations
│   └── ui/     @devmentor/ui
│       └── src/
│           ├── components/ui/         shadcn primitives (CLI only)
│           └── backend/               apiCall, CrudForm, DataTable, feedback states
├── .ai/                         AI-agent specs, run logs, lessons (see AGENTS.md)
├── .env.example                 documented environment variables
├── eslint.config.mjs            lint config for all packages
└── tsconfig.base.json           shared compiler options
```

### Package dependencies

```
            ┌──────────────────┐
            │  @devmentor/app  │  routes, pages, API, composition
            └───┬─────────┬────┘
                │         │
                ▼         ▼
 ┌─────────────────┐   ┌────────────────┐
 │ @devmentor/core │   │ @devmentor/ui  │
 │ services + DI   │   │ shadcn-ui      │
 └────────┬────────┘   └────────────────┘
          ▼
 ┌─────────────────┐
 │  @devmentor/db  │──▶ PostgreSQL
 │  MikroORM       │
 └─────────────────┘
```

Dependencies point inward only. `db` and `ui` know nothing about the other packages, and nothing imports `app`. Workspace packages export their TypeScript source directly (no build step); Next.js/Turbopack transpiles them.

Domain code is organized by concept (`auth`, `bookings`, …): the same sub-folder name repeats in `db`, `core`, `app` and `ui`. Naming, layering and security rules are in `.ai/specs/implemented/2026-09-01-engineering-standards.md`.

### Request flow

1. A Route Handler is wrapped in `apiHandler` (or built by `makeCrudRoute`), which opens a request scope, validates input with the shared Zod schema, and returns a `{ ok, data }` / `{ ok: false, error }` envelope. Server Components and Server Actions call `withRequestScope(cradle => …)` instead. Client components talk to `/api/*` only through `apiCall`.
2. That creates a child scope of the process-wide Awilix container (`@devmentor/core`).
3. The scope resolves `em`, a fresh fork of the MikroORM `EntityManager` with its own identity map, and the scoped services that depend on it, e.g. `userService`.
4. The process-wide ORM (`getOrm()` in `@devmentor/db`) owns one PostgreSQL connection pool, sized by `DATABASE_POOL_MIN`/`DATABASE_POOL_MAX`. The ORM and the container are cached on `globalThis`, so dev-server hot reloads don't open new pools.
5. The scope is disposed when the work finishes.

Pages that query the database call `await connection()` first, so they render per request and never during `next build`.

### Database and migrations

- Entities: `packages/db/src/entities/<concept>/<name>.entity.ts`, registered in `entities/index.ts`.
- Migrations: `packages/db/src/migrations/` (TypeScript, generated by the MikroORM CLI, committed to git).
- The CLI config is `packages/db/src/mikro-orm.config.ts`. It shares the runtime options from `config.ts` and adds the Migrator.
- Workflow: change an entity → `npm run db:migration:create` → review the file → `npm run db:migrate`.

### Frontend vs. admin UI

The public site and the admin panel are separate route groups with their own root layouts and stylesheets:

- `(frontend)`: `frontend.css` contains Tailwind only. Pages use utility classes directly.
- `(admin)`: `admin.css` contains Tailwind plus the shadcn theme from `@devmentor/ui/styles.css`. Pages compose shadcn primitives from `@devmentor/ui/components/ui/*` and the shared building blocks from `@devmentor/ui/backend/*`.

To add more shadcn components, run `npx shadcn@latest add <component>` inside `packages/ui`.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `DATABASE_POOL_MIN` | `0` | Minimum pooled connections per process |
| `DATABASE_POOL_MAX` | `10` | Maximum pooled connections per process |
| `DATABASE_DEBUG` | `false` | Log SQL queries |

All `.env*` files live in the repository root and are loaded for both Next.js and the MikroORM CLI.

## Working with AI coding agents

Agent rules live in [`AGENTS.md`](AGENTS.md); `CLAUDE.md` includes it. Specs, run logs and lessons learned are kept in [`.ai/`](.ai).

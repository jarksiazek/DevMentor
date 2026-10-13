# Spec: DevMentor monorepo foundation

- **Date**: 2026-10-13
- **Status**: Implemented (2026-10-13)

## Goal

Turn the single Next.js starter into the DevMentor monorepo with the agreed stack, so later features land in a predictable place.

## Stack (fixed decisions)

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict) |
| Database | PostgreSQL |
| ORM | MikroORM 7 (`@mikro-orm/postgresql`), migrations via `@mikro-orm/migrations`, built-in connection pool |
| DI | Awilix |
| Frontend (public) pages styling | Tailwind CSS 4 |
| Backend (admin) pages UI | shadcn-ui (built on Tailwind) |
| Monorepo | npm workspaces, packages in `packages/*` |

## Packages (minimum set)

| Package | Name | Responsibility | May depend on |
| --- | --- | --- | --- |
| `packages/app` | `@devmentor/app` | Main integration package: Next.js app, routes, pages, API handlers, composition root | `core`, `db`, `ui` |
| `packages/core` | `@devmentor/core` | Domain services, Awilix container factory and registrations | `db` |
| `packages/db` | `@devmentor/db` | MikroORM config, entities, migrations, ORM bootstrap | — |
| `packages/ui` | `@devmentor/ui` | shadcn-ui components, `cn` helper and theme CSS for backend pages | — |

Dependencies point inward only (`app → core → db`; `app → ui`). No package imports `app`.

## Conventions

- Workspace packages ship TypeScript source (`exports` → `./src/*.ts`); no build step. Turbopack transpiles workspace packages automatically.
- Entities use MikroORM `defineEntity` (no decorators, no reflect-metadata).
- `@mikro-orm/*` and `pg` are server-only and kept in `serverExternalPackages`.
- One ORM instance per process (cached on `globalThis` to survive HMR); one forked `EntityManager` per request via an Awilix scope.
- Routes: public pages under `app/(frontend)` styled with plain Tailwind; admin pages under `app/backend` using `@devmentor/ui`.
- Config through env vars (`DATABASE_URL`, pool sizes); `.env.example` documents them.

## Acceptance criteria

1. `npm install` at the root installs all workspaces.
2. `npm run dev` (root) starts the app; `npm run build`, `npm run lint`, `npm run typecheck` pass.
3. `/` renders a Tailwind-styled frontend page; `/backend` renders a shadcn-ui page.
4. `/api/health` resolves a service from the Awilix container and reports DB connectivity.
5. `npm run db:migration:create` / `db:migrate` work against a local PostgreSQL; an initial migration exists.
6. `AGENTS.md` documents the stack and conventions; `README.md` documents the architecture.

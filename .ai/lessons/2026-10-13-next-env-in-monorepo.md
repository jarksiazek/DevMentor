# Loading root `.env*` files in the monorepo (`@next/env`)

## Context

`.env*` files live in the repo root, but Next.js only loads them from its project dir (`packages/app`), and the MikroORM CLI runs from `packages/db`.

## Pitfalls found

1. **Cache.** Next calls `loadEnvConfig(packages/app)` before it evaluates `next.config.ts`. A later `loadEnvConfig(repoRoot)` returns the cached result and loads nothing. Pass `forceReload = true` (4th argument). Verified: without it, `next start` reported `DATABASE_URL is not set`.
2. **Import style differs by runtime.** `next.config.ts` is compiled to CJS, where `import nextEnv from "@next/env"` is `undefined`, so use `import { loadEnvConfig }`. Under native ESM (MikroORM CLI via tsx) the named import fails ("does not provide an export named"), so use the default import.
3. **Shell wins.** `loadEnvConfig` never overrides variables that are already set in `process.env`. See [sandbox-database-url](2026-10-13-sandbox-database-url.md).

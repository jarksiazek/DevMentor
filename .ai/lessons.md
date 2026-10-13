# Lessons Learned

Long-term memory for LLM agents working in this repository. Read this file before starting a task; append to it after fixing a bug, discovering a pitfall, or finding an improvement worth remembering.

## How to use

- Keep this file as a short **index**: one entry per lesson, newest first.
- Put details (context, root cause, fix, how to avoid) in `.ai/lessons/YYYY-MM-DD-slug.md` and link to it from here.
- Small, self-explanatory lessons may live entirely in the index entry.
- Before adding a lesson, check for an existing one and update it instead of duplicating.
- Delete or amend lessons that turn out to be wrong or outdated.

## Entry format

```
- **YYYY-MM-DD — Title**: one-line takeaway. ([details](lessons/YYYY-MM-DD-slug.md))
```

## Lessons

<!-- Newest first. -->

- **2026-10-13 — Preview 500 after restructure = stale dev server**: the sandbox preview on :3000 keeps running the process it started with; after moving the app to `packages/app` it kept serving from `/workspace` (`scandir '/workspace/src/app'`). Read `.next/dev/logs/next-development.log` (root and `packages/app`), then `fuser -k 3000/tcp`; the supervisor respawns it from `openmercato.toml`.
- **2026-10-13 — Zod 4 runs checks in order**: `z.email().trim()` validates the email *before* trimming, so `" a@b.co "` fails. Normalize first: `z.string().trim().toLowerCase().pipe(z.email())`.
- **2026-10-13 — Vitest coverage globs are relative to each project root**: with `test.projects`, `coverage.include: ["packages/*/src/**"]` matches nothing (0/0, gate silently "passes"). Use `src/**/*.{ts,tsx}`. After changing coverage config, check the report actually lists files.
- **2026-10-13 — agent-browser in the sandbox/CI**: npm's install-script gating skips its postinstall, but the bundled binary still works. Chrome needs `npx agent-browser install --with-deps` here (missing `libnspr4` etc.), and Ubuntu 24.04 runners need `AGENT_BROWSER_ARGS=--no-sandbox`.
- **2026-10-13 — No Docker in the sandbox**: testcontainers cannot run locally here. Use a throwaway cluster (`initdb` from `/usr/lib/postgresql/17/bin`, port 5433, `/tmp`) and `INTEGRATION_DATABASE_URL`.
- **2026-10-13 — Unit tests mock at the package boundary**: the `@devmentor/core` route tests `vi.mock("@devmentor/core")` and capture the config passed to `makeCrudRoute`/`apiHandler`, then call the `run` callbacks with fake services. Same pattern for any new Route Handler.
- **2026-10-13 — shadcn CLI `cn` rewrite recurs**: it happened again on `shadcn add input label` (2nd time). Always grep `from "cn"` after any `shadcn add`.
- **2026-10-13 — shadcn CLI may import `cn` from npm**: after `shadcn add` in `packages/ui`, check that components import `cn` from `@devmentor/ui/lib/utils`. The CLI rewrote it to the unrelated npm package `cn` and added it to dependencies.
- **2026-10-13 — Sandbox `NODE_ENV=development` breaks `next build`**: it fails prerendering `/_global-error` with `Cannot read properties of null (reading 'useContext')`. Build with `env -u NODE_ENV npm run build`.
- **2026-10-13 — `@next/env` in the monorepo**: use `forceReload` in `next.config.ts`; named import in CJS-compiled config, default import under native ESM. ([details](lessons/2026-10-13-next-env-in-monorepo.md))
- **2026-10-13 — `pkill -f '<pattern>'` can kill your own shell**: the pattern also matches the invoking command line. Free ports with `fuser -k <port>/tcp` instead.
- **2026-10-13 — Shell `DATABASE_URL` beats `.env`**: the sandbox exports a foreign `DATABASE_URL`; `.env` never overrides it. Always set `DATABASE_URL` explicitly for DB commands. ([details](lessons/2026-10-13-sandbox-database-url.md))

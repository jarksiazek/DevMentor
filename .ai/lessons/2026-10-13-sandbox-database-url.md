# Sandbox shell exports a DATABASE_URL that is not ours

## What happened

While bootstrapping `@devmentor/db`, `npm run db:migrate` was run after copying `.env.example` to `.env`. The sandbox shell already exports `DATABASE_URL` (pointing at a pre-existing `open-mercato` database). `@next/env` / `loadEnvConfig` never overrides variables already present in `process.env`, so the migration ran against that foreign database instead of the local dev DB.

## Rule

- Before any command that touches a database (migrations, schema tools, seeds, app runs that write), check `env | grep DATABASE_URL`.
- In agent runs, always pass the target explicitly: `DATABASE_URL=postgresql://…@127.0.0.1:<port>/<db> npm run db:migrate`.
- Never inspect or "clean up" a database you did not create; report it to the user instead.

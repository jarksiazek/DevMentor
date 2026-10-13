# Run: rename the admin panel from /backend to /admin

- **Goal**: URL `/backend` → `/admin`, and every app-side path with it. Scope confirmed with the user: app routes only; the shared UI library path `@devmentor/ui/backend/*` stays.
- **Specs**: `implemented/2026-10-13-monorepo-foundation.md`, `implemented/2026-09-01-engineering-standards.md` (dated update notes added), `implemented/2026-10-13-ci-and-testing.md` (integration scope paths updated).
- **Branch**: `refactor/backend-to-admin`

## Changes

- `git mv`: `app/(backend)` → `app/(admin)`, `(admin)/backend/` → `(admin)/admin/`, `backend.css` → `admin.css`.
- `layout.tsx`: imports `admin.css`, titles "DevMentor admin", header link `/admin`, `AdminLayout`. `page.tsx`: `AdminDashboardPage`.
- Home page link: `/admin`, label "Open the admin panel".
- Unit and integration tests updated to the new URL, titles and names. `core/src/http/auth.ts` comment.
- Docs: `AGENTS.md` (stack label, UI and routing, reference example), `README.md`.
- No redirect from `/backend` was added (not requested); old links now 404.

## Verification

- `npm run lint` ✅, `npm run typecheck` ✅, `npm test` ✅ (139 tests, 100% coverage), `env -u NODE_ENV npm run build` ✅ (routes: `/`, `/admin`, `/api/*`), `npm run test:integration` ✅ (6 tests, throwaway cluster on 5433, removed afterwards).
- Dev preview on :3000: `/` 200, `/admin` 200, `/backend` 404.
- Committed and opened as a PR at the user's request.

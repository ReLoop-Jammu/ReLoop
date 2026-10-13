# ReLoop

E-waste / used-electronics marketplace, starting in Jammu and selling across India.

## Read first, and follow

- **[docs/architecture.md](docs/architecture.md)**: stack, repo structure, roles, data model, routes, design system and phased roadmap.
- **[docs/engineering-standards.md](docs/engineering-standards.md)**: mandatory code, security, testing and workflow rules.
- **[docs/adr/](docs/adr/)**: why the key decisions were made. Changing a decision means writing a new ADR.

## Layout

- `frontend/`: the Next.js 16 website. Read `frontend/AGENTS.md` before touching Next.js APIs; this version differs from older training data.
- `backend/`: the Supabase schema, RLS, storage and seed as SQL migrations, tested with PGlite (`npm test -w backend`).
- `legacy/index.html`: the old prototype, reference only. Don't build on it.

## Current state (2026-10-13, after the database fix)

Latest checks: `docs/health-check-2026-10-13.md`, `docs/live-check-2026-10-13.md` and `docs/security-report-2026-10-14.md`. To apply the database fix, follow `docs/runbooks/apply-fix-2026-10-14.md`.

- **The Business Plan is the source of truth** (ADR 0004).
  - ReLoop buys stock outright (purchase-only: no consignment, no self-listing), grades it A–D at one Jammu hub and resells it.
  - Numbers come only from `frontend/src/config/business-rules.ts`, summarised in `docs/business-rules.md`.
- **Stack:** Next.js 16 on Vercel, with a **live Supabase project (Postgres 17) connected through the Vercel Marketplace integration**.
  - **Region:** the database is in AWS `ap-south-1` (Mumbai). `frontend/vercel.json` pins server functions to `bom1` (Mumbai) as well; they ran in `iad1` (US East) until that is deployed.
  - Every Vercel variable is marked Sensitive, so the CLI can't read values back.
  - The code reads `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, the last server-only.
- **Preview deployments share the production database.** Preview has the same Supabase and Postgres credentials as Production.
  - Never run e2e tests, seeds or migrations against a preview or production.
  - **e2e tests need a separate test database.** Until one exists, they run only in CI (`CI=true`, not on Vercel), where the shop falls back to the sample stock file `frontend/src/data/shop-snapshot.json`. Anywhere else, missing Supabase variables fail the build on purpose.
- **Public site:**
  - Pages: home, `/shop` (+ `/shop/[RL-JMU-id]`), `/sell` (shops, institutions), how-it-works, where-scrap-goes, warranty, impact, contact, legal.
  - Accounts: `/register`, `/login`, `/account`.
  - The shop reads the live `listings` and `categories` tables (`frontend/src/features/shop/queries.ts`).
  - Institution forms hand off to WhatsApp or email (`SITE.whatsapp` / `SITE.supportEmail` in `frontend/src/lib/site.ts`).
- **Accounts and verification:**
  - Sign-up is Supabase Auth with the role `buyer` or `shop_owner`; the browser session is kept in `localStorage`.
  - **Email confirmation is off** (`mailer_autoconfirm: true`). Switch it on in the Supabase dashboard, after setting up a custom SMTP sender.
  - GSTIN is optional (live since 2026-10-13): empty is allowed, the format is checked when one is given, and the form has a "Not GST-registered" option. Nothing checks a GSTIN is real.
  - New shop owners are `pending`. A shop owner can't change their own `verification_status`: RLS allows owners only to read, and after the fixes a trigger also blocks it. Only admins (`is_admin()`: an active `admin_users` row, or a hub staff admin) or the dashboard can verify, and there is no admin screen.
  - `/api/shop-submissions` checks the session and verification on the server before using the service-role key.
  - The form's conditions (Working, Broken, …) are mapped in `frontend/src/features/sell/conditions.ts` to the values `shop_submissions.condition` allows. On `main`, every condition but "Working" is rejected by the database.
  - To make someone an admin, use `supabase-fixes/make-admin.sql`.
- **Staff hub:** `/hub` (dashboard, intake, items, shops & institutions, handovers, backup & publish) stores its data **in each browser only**. It has no login and is not connected to Supabase.
- **Database:**
  - Live tables: `admin_users`, `categories`, `enquiries`, `institution_submissions`, `listings`, `orders`, `processing_records`, `profiles`, `shop_owners`, `shop_submissions`. All have RLS on.
  - They were made by hand; `20261010000001_live_baseline.sql` now describes them, and is guarded so it changes nothing live.
  - The repo's hub tables (`items`, `item_events` and the rest) now exist live, with RLS on, but are empty: the hub app still stores data in each browser.
  - **The 2026-10-14 fix is applied** (2026-10-13; see the execution record in `docs/runbooks/apply-fix-2026-10-14.md`). Every hole the SQL could fix is closed (the High one and two Mediums, plus the Lows), and `supabase-fixes/2026-10-14-checks.sql` shows 13 of 13 true; re-run it after any database change. Still open: email confirmation is off, and Preview shares the production database.
    - Live and repo schemas match: migrations `20261010000001` (baseline) and `20261014000001` describe what the fix applied.
    - There is 1 admin (`admin_users`). Add more with `supabase-fixes/make-admin.sql`.
    - Back up before any live change with `scripts/backup-live-data.sh`.
  - `backend/tests/live.test.mjs` replays every query the site makes, on the live schema before and after the fix. Add new queries there.
- Pushing to `main` deploys to production through Vercel. Work on a branch and open a PR.

## Working rules

- Run `npm run check` and `npm run test:e2e` from the repo root before calling work done.
- Every DB change is a new file in `backend/supabase/migrations/` with a test in `backend/tests/`.
- Never put unsupported claims on the public site (authorisations, certifications, India-wide shipping, internal financials); the e2e copy test enforces this.
- Build one roadmap phase at a time, on its own branch. The user reviews each phase before merging and before the next one starts.
- Never commit secrets or `.env` files. Commit locally, and push only when the user asks.
- At the end of every task, update docs/progress.md.

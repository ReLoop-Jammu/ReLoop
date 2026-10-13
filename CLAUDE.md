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

## Current state (2026-10-14, after round 4)

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
- **No email sending, by decision.** Password recovery is admin-only.
  - Admins reset passwords on `/hub/users` after confirming the person by phone. The server route generates a temporary password, shows it once and logs the reset in `admin_audit_log`, never the password.
  - `profiles.must_change_password` makes `is_admin()` and `is_staff()` false until the user sets a new password at `/account/change-password`.
  - `/resend-confirmation` is unlinked (the code is kept).
- **The loop:**
  - shop submissions are reviewed on `/hub/submissions` (offer or reject), and `convert_submission()` turns an accepted offer into linked hub items;
  - shop owners see their offers on `/account`;
  - reservations, questions and institution pickups are saved through `/api/requests` (service key, validated) and handled on `/hub/requests`;
  - visitors can't insert or read requests directly.
- **Partner map:** admins put verified shops on `/locations` from `/hub/shops`, with a recorded consent date, through the `map_partner_shops` view (name, market and position only).
- **Team:** `/hub/team` promotes or demotes staff and admins through `set_account_role()`. Triggers keep at least one admin. `supabase-fixes/make-admin.sql` is only for recovering the first admin.
- **Read-only checks:** `supabase-fixes/2026-10-14-checks.sql` (13) plus `supabase-fixes/live-checks-extra.sql` (30) were 43 of 43 true at the end of round 4 (2026-10-14). Run both after every database change; add a check for every new permission.
- **Staff hub:** `/hub` (dashboard, intake, items, requests, shop submissions, shops & institutions, handovers, shop verification, users, team, data & exports) runs on **Supabase** behind a staff login, through `frontend/src/features/inventory/store/supabase.ts`.
  - Admins count as staff (`is_staff()`).
  - Without the Supabase variables (local dev, CI) it falls back to the device-only store.
  - Tags come from the database (next real item `RL-JMU-0006`).
  - The day-45/75 rules run daily at 06:00 IST (`pg_cron`) and are idempotent.
  - Visitors read only shop-facing item columns; checked by `supabase-fixes/live-checks-extra.sql`, run alongside the 13 checks.
- **Database:**
  - Live tables: `admin_users`, `categories`, `enquiries`, `institution_submissions`, `listings`, `orders`, `processing_records`, `profiles`, `shop_owners`, `shop_submissions`. All have RLS on.
  - They were made by hand; `20261010000001_live_baseline.sql` now describes them, and is guarded so it changes nothing live.
  - The repo's hub tables (`items`, `item_events` and the rest) are live and used by the hub; listed hub items appear in the shop, and the sample listings hide once real stock exists.
  - **The 2026-10-14 fix is applied** (2026-10-13; see the execution record in `docs/runbooks/apply-fix-2026-10-14.md`). Every hole the SQL could fix is closed (the High one and two Mediums, plus the Lows), and `supabase-fixes/2026-10-14-checks.sql` shows 13 of 13 true; re-run it after any database change. Still open: email confirmation is off, and Preview shares the production database.
    - Live and repo schemas match: migrations `20261010000001` (baseline) and `20261014000001` describe what the fix applied.
    - There is 1 admin, the shared ReLoop admin account (`admin_users`). Add more with `supabase-fixes/make-admin.sql`.
    - Account roles are `buyer`, `shop_owner` and (from migration `20261015000001`) `admin`. The role is a label; admin rights come from `is_admin()`. Sign-up can't choose `admin`. `supabase-fixes/tidy-admin-account.sql` confirms the shared admin account, renames it "ReLoop Admin", removes its leftover shop row and sets its role to `admin`. The `admin` role is live (2026-10-13), but the tidy script has **not** been run: the admin account's shop row turned out to be verified, which is one of its safety stops.
    - Back up before any live change with `scripts/backup-live-data.sh`.
  - `backend/tests/live.test.mjs` replays every query the site makes, on the live schema before and after the fix. Add new queries there.
- **Locations and QR:** `/locations` reads everything from `frontend/src/config/locations.ts`. The printed awareness-drive QR codes point at `https://re-loop-ochre.vercel.app/go/drive`, so **that domain must stay assigned to the Vercel project**: printed codes depend on it. Clicks on every short link (`/go/<slug>`, from `frontend/src/config/tracked-links.ts`) are counted in `link_visits` (link, source, medium, time only); `qr_scans` is no longer written.
- **Round 4 (2026-10-14):**
  - **Retention:** the `reloop-request-retention` pg_cron job (03:30 IST) deletes requests 12 months after they were closed; the privacy page states the same rule.
  - **Outreach:**
    - `/what-we-accept`;
    - WhatsApp chat buttons (item pages except samples, sell pages);
    - the home-page impact counter (`impact_totals` view, "Pilot starts November 2026" until a total is above zero);
    - printable A4 poster and flyer (`/print`, PDFs in `frontend/public/print/`, `npm run print -w frontend`).
  - **Guides:**
    - `/help` for shop owners in English and Hindi (from `frontend/src/features/help/guide.json`; `npm run help-guide -w frontend` regenerates `docs/report/shop-owner-guide.md`);
    - `docs/report/staff-guide.md`;
    - `docs/report/platform-section.md` for the report;
    - `docs/report/tracked-links.md`.
- **What's not done yet:** see `docs/known-limitations.md` (launch items, email, sessions, rate limiting, test database, backups).
- Pushing to `main` deploys to production through Vercel. Work on a branch and open a PR.

## Working rules

- Run `npm run check` and `npm run test:e2e` from the repo root before calling work done.
- Every DB change is a new file in `backend/supabase/migrations/` with a test in `backend/tests/`.
- Never put unsupported claims on the public site (authorisations, certifications, India-wide shipping, internal financials); the e2e copy test enforces this.
- Build one roadmap phase at a time, on its own branch. The user reviews each phase before merging and before the next one starts.
- Never commit secrets or `.env` files. Commit locally, and push only when the user asks.
- At the end of every task, update docs/progress.md.

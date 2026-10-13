# Production health check, 2026-10-13

The first read-only check of the live site after the teammate's account and shop-submission work was merged to `main` (production commit `2e3ea0c`). For the git history behind it, see [status.md](status.md).

The live-database results (RLS, policies, grants, buckets) are in [Live database](#live-database-2026-10-13) below.

## Onboarding blockers

- **Email confirmation is off.** `GET /auth/v1/settings` returns `mailer_autoconfirm: true`, so anyone can sign up with an address they don't own. The local `backend/supabase/config.toml` also has it off.
- **GSTIN is mandatory for shop owners, but only its format is checked.**
  - The sign-up form requires 15 letters or numbers.
  - The 2026-10-13 sign-up trigger rejects a missing or malformed GSTIN.
  - Nothing checks that the GSTIN is real.
- **New shop owners start `pending` and can't submit items until someone sets them to `verified`.** There is no admin screen for this, so it has to be done by hand in Supabase.
- **There was no way to reach ReLoop.** The WhatsApp number and support email were empty in `site.ts`, so the institutions form could only say "copy your request". Fixed on branch `chore/prod-health`.

## Security

- **The shop-submission route does check the caller on the server.** Before it inserts anything with the service-role key, `frontend/src/app/api/shop-submissions/route.ts`:
  - sends the caller's access token to Supabase Auth (`/auth/v1/user`) to confirm the session;
  - requires `profiles.role = 'shop_owner'`;
  - requires `shop_owners.verification_status = 'verified'`.
- **One shop can't write rows for another.** `shop_owner_id` always comes from the verified token, never from the request body.
- **Whether a user can verify themselves depends on the live grants and policies on `shop_owners`.** That table was created by hand, outside the repo's migrations. See [Live database](#live-database-2026-10-13).
- **Preview deployments share production.** Preview has the same service-role key, JWT secret and Postgres credentials as Production, so any branch preview reads and writes the live database. Never run e2e tests against a preview.
- **Smaller issues:**
  - The login session is kept in `localStorage`.
  - There is no rate limit on sign-up or submissions.
  - `/hub` is public with no login. Its data stays in each browser, so no live data leaks through it.
- **Region mismatch.** Vercel functions run in `iad1` (US East), but the database is in AWS `ap-south-1` (Mumbai), so every server request to Supabase crosses the world.

## Broken

- **`npm run check`** failed at Prettier (20 files). Lint had 3 errors and 2 warnings:
  - `register/page.tsx`: two unescaped apostrophes.
  - `ShopSubmissionForm.tsx`: sets state directly inside an effect.
  - `ItemVisual.tsx`: uses a plain `<img>` instead of the Next.js image component (warning).
  - `queries.ts`: an unused import (warning).

  Typecheck and the 36 unit tests passed. All of this is fixed on `chore/prod-health`.

- **All 16 backend tests fail at setup.** Migration `20261011000001` alters `shop_owners` and `shop_submissions`, but no migration creates them. Not fixed: it needs a migration rebuilt from the live schema.
- **The e2e tests can't run locally or in CI.** `next build` fails while collecting page data for `/shop/[itemId]` because the Supabase variables are missing, and there is no non-production database to point it at. Not fixed.
- **Vercel environment variables:**
  - Production and Preview each have 16 variables; Development has none.
  - The code reads `SUPABASE_SERVICE_ROLE_KEY`. `SUPABASE_SECRET_KEY` is set but unused, and the docs named it instead; the docs are fixed on the branch. No Vercel variable was renamed or removed.
  - Also set but unused: `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWT_SECRET` and the `POSTGRES_*` variables.
  - All of them are marked Sensitive, so the CLI cannot read them back, not even through `vercel env run`.
- **Production build and runtime:**
  - The production build of `2e3ea0c` is clean.
  - An earlier deploy of `f70b157` failed because merge-conflict markers were committed.
  - There were no runtime logs in the last 7 days.
  - Every public page returned 200, and `/shop` showed 5 live listings.

## Missing for grading

- **Hub location:** not shown. The contact page says "Old-city market area, Jammu (opening November 2026)" and "Hours to be published".
- **Partner drop-off points:** none are listed. The home page also mentioned "household drop-offs", a path that was removed; that line is fixed on the branch.
- **Tuesday/Friday pickup route:** text only, on `/`, `/sell` and `/sell/shops` (Raghunath Bazaar, Residency Road, Gandhi Nagar). There is no map, stop list or times.
- **Web analytics:** Vercel Web Analytics and Speed Insights were installed but switched off, because `VERCEL_ANALYTICS` wasn't set.
  - Web Analytics was already enabled on the Vercel project.
  - On 2026-10-13, `VERCEL_ANALYTICS=on` and `NEXT_PUBLIC_SITE_URL` were added to Production only, and production was redeployed. The live page now loads the analytics bundle.

## Live database (2026-10-13)

Checks run against the live project without changing anything. In this round:

- the anonymous REST API was queried for status codes and row counts only;
- the host name was resolved against AWS's public IP ranges;
- `GET /auth/v1/settings` was read.

| Check                                              | Result                                                                                                                                                                                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email confirmation                                 | Off (`mailer_autoconfirm: true`). Sign-up is open, email provider only.                                                                                                                                                             |
| Region                                             | AWS `ap-south-1` (Mumbai)                                                                                                                                                                                                           |
| Hub tables live?                                   | No. `items`, `item_events`, `item_photos`, `item_counters`, `staff`, `partners`, `institutions`, `repair_jobs`, `consignments`, `handovers` and `submissions` all return "not found". The repo's hub schema has never been applied. |
| Anonymous reads                                    | `listings` 5 rows, `categories` 9 rows. `shop_owners`, `shop_submissions` and `profiles` return 0 rows to anon.                                                                                                                     |
| RLS, policies, grants, users, buckets, schema dump | Pending: needs a direct, read-only database connection (see the PR).                                                                                                                                                                |

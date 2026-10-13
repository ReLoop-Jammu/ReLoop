# Repo status, 2026-10-13

Written after pulling `origin/main` into the local `main` (fast-forward from `b0e8831` to `2e3ea0c`, no merge conflicts).

## 1. What the teammate changed

28 commits by `ReLoop-Jammu`, 2026-10-09 to 2026-10-13, all pushed straight to `main` (and so deployed). Net change: 37 files, +971 / −710.

In between, commit `39f28da` ("please") added a larger, more hardened version: cookie sessions, server-side `/api/auth/*` routes, rate limiting, input validation, ADR 0005, and backend and e2e tests. The next commit, `2e3ea0c` ("ab hoja"), reverted almost all of it. None of that work is in the current code. It can still be recovered from `39f28da`.

What the code does now:

**Accounts (new)**

- `/register`, `/login` and `/account` pages, plus `frontend/src/lib/auth-client.ts`. The browser calls Supabase Auth directly and keeps the session in `localStorage` (`reloop-auth-session`).
- There are two roles: `buyer` and `shop_owner`. A shop owner gives a GSTIN, which is only format-checked, and starts as `pending` until ReLoop verifies them by hand.
- The header now has an "Account" button.

**Shop-owner submissions (new)**

- `frontend/src/app/api/shop-submissions/route.ts` is a server route that uses the Supabase **service-role key**. It checks the user's token, requires role `shop_owner` and `verification_status = verified`, then inserts 1–10 rows into `shop_submissions`.
- `ShopSubmissionForm.tsx` is the form on `/sell/shops`.

**Public shop now reads live Supabase**

- `frontend/src/features/shop/queries.ts` no longer reads `shop-snapshot.json`. It fetches `listings` (status `Active`, stock > 0) and `categories` from Supabase REST with the publishable key. If the env vars are missing it throws an error.

**Business model: purchase-only**

- Consignment and self-listing were removed from `business-rules.ts`, the inventory model, the pricing helpers, the store, the sell pages and the terms.
- The household path was removed: the `/sell/home` page, `BuyEstimator.tsx` and `HouseholdSell.tsx`.
- The `/sell/consignment` and `/sell/list-yourself` pages were deleted. The sitemap, footer and home page were updated to match.
- Hub intake (`IntakeForm.tsx`) now records the supplier's contact name and phone, plus the purchase payment method, reference and date.

**Database migrations (new)**

- `20261011000001_accounts_and_shop_verification.sql`: adds a `profiles` table, an `account_role` enum, GSTIN and verification columns on `shop_owners`, RLS policies, and a sign-up trigger on `auth.users`.
- `20261012000001_purchase_only_supplier_records.sql`: adds the supplier and payment columns to `items`.
- `20261013000001_fix_signup_phone_validation.sql`: validates name and phone in the sign-up trigger.

**Other**

- New root docs: `ACCOUNT_SETUP.md` and `SIGNUP_FIX_README.md`, which explain how to apply the SQL by hand in the Supabase SQL editor.
- `ItemVisual.tsx` switched from `next/image` to a plain `<img>`.
- The e2e tests were updated: household tests removed, `/sell/shops` flow changed.
- Small edits to `docs/architecture.md`, `docs/business-plan-alignment.md` and `backend/README.md`.

### Problems found after the pull

- **Backend tests fail.** `npm test -w backend` errors on `20261011000001` because it alters `public.shop_owners` and `public.shop_submissions`, and no migration in the repo creates those tables.
- **The repo schema and the live database have drifted.** The shop reads `listings` and `categories`, and the API writes `shop_submissions`. None of these tables are defined in `backend/supabase/migrations/`, which defines `items`, `submissions` and so on. They seem to have been created by hand in the live project.
- **No tests cover the new migrations.** The project rules require one per DB change.
- **The docs are out of date.**
  - `docs/architecture.md` still lists `/sell/consignment` and `/sell/list-yourself`, which no longer exist.
  - The "Current state" section of `CLAUDE.md` still describes "no backend yet", the snapshot-based shop and the household estimator.
- **Sessions are stored in `localStorage`.** `ACCOUNT_SETUP.md` itself says to move to HTTP-only cookies and to add rate limiting.
- `npm run check` and `npm run test:e2e` have not been run since the pull.

## 2. What I changed locally

Nothing pending. The working tree was clean, and no local commits were ahead of `origin/main`, so there was nothing to commit before the pull.

My last commit is `adbc6e3` (2026-10-08), "fix: clear editor warnings and stop analytics 404s in the browser". It was already merged through PR #13. `b0e8831`, the commit before the pull, is a Dependabot bump (#12).

## 3. Files and what they do

Not listed one by one: `frontend/public/images/` (static images), `legacy/index.html` (the old prototype, reference only) and `package-lock.json`.

### Root

| File                                                         | Purpose                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `README.md`, `CLAUDE.md`                                     | Project overview and agent/working rules                                      |
| `ACCOUNT_SETUP.md`                                           | Teammate's steps for setting up accounts in Supabase/Vercel (new)             |
| `SIGNUP_FIX_README.md`                                       | Teammate's steps for applying the sign-up fix SQL by hand (new)               |
| `index.html`                                                 | Keeps the GitHub Pages link showing the old prototype                         |
| `package.json`                                               | npm workspaces (`frontend`, `backend`) and root scripts (`check`, `test:e2e`) |
| `commitlint.config.mjs`, `.husky/*`                          | Conventional-commit check and pre-commit hooks                                |
| `.prettierrc.json`, `.prettierignore`, `.gitignore`          | Formatting and ignore rules                                                   |
| `.vscode/*`                                                  | Recommended extensions and editor settings                                    |
| `.github/workflows/ci.yml`                                   | CI: lint, typecheck, unit, backend and e2e tests                              |
| `.github/dependabot.yml`, `.github/pull_request_template.md` | Dependency bumps and the PR template                                          |

### docs/

| File                            | Purpose                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| `architecture.md`               | Stack, structure, roles, data model, routes, roadmap             |
| `engineering-standards.md`      | Mandatory code, security and testing rules                       |
| `business-rules.md`             | Summary of `business-rules.ts`                                   |
| `business-plan-alignment.md`    | Gap analysis against the Business Plan, plus open questions      |
| `frontend-improvements-plan.md` | Planned frontend improvements                                    |
| `team-setup.md`                 | Setting up accounts (Supabase, Vercel, Google) and env vars      |
| `adr/0001`–`0004`               | Decisions: stack, moderation, deferred payments, owned inventory |
| `status.md`                     | This file                                                        |

### backend/

| File                                                           | Purpose                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `README.md`, `package.json`                                    | Backend notes, next steps and the test script                             |
| `supabase/config.toml`, `supabase/.gitignore`                  | Supabase CLI local config                                                 |
| `migrations/20261007000001_hub_inventory.sql`                  | Core schema: items, partners, institutions, submissions, handovers, RLS   |
| `migrations/20261007000002_item_photos_storage.sql`            | Storage bucket and policies for item photos                               |
| `migrations/20261011000001_accounts_and_shop_verification.sql` | Profiles, roles, shop verification, sign-up trigger (new; fails in tests) |
| `migrations/20261012000001_purchase_only_supplier_records.sql` | Supplier and payment columns on `items` (new)                             |
| `migrations/20261013000001_fix_signup_phone_validation.sql`    | Name and phone validation in the sign-up trigger (new)                    |
| `supabase/seed.sql`                                            | Sample data                                                               |
| `tests/db.mjs`, `tests/supabase-shim.sql`                      | PGlite test harness and the Supabase roles/auth shim                      |
| `tests/schema.test.mjs`                                        | Schema and RLS tests                                                      |

### frontend/ (config)

| File                                                                                         | Purpose                                                 |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` | Next.js 16 app config                                   |
| `vitest.config.mts`, `vitest.setup.ts`, `playwright.config.ts`                               | Unit and e2e test config                                |
| `.env.example`                                                                               | Env var template (no values)                            |
| `AGENTS.md`, `CLAUDE.md`, `README.md`                                                        | Notes for agents and developers working on the frontend |

### frontend/src/app/ (routes)

| Path                                                                                               | Purpose                                                                       |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `layout.tsx`, `globals.css`, `error.tsx`, `not-found.tsx`                                          | Root layout, theme, and error pages                                           |
| `icon.svg`, `manifest.ts`, `opengraph-image.tsx`, `robots.ts`, `sitemap.ts`                        | Icons, PWA manifest, social image, SEO                                        |
| `(site)/layout.tsx`, `(site)/page.tsx`                                                             | Public layout and home page                                                   |
| `(site)/shop/page.tsx`, `(site)/shop/[itemId]/page.tsx`                                            | Shop listing and item detail (now Supabase-backed)                            |
| `(site)/sell/page.tsx`, `sell/shops`, `sell/institutions`                                          | Sell landing page, shop path (with submission form), institution path         |
| `(site)/register`, `(site)/login`, `(site)/account`                                                | Sign-up, log-in, and account/verification status (new)                        |
| `(site)/how-it-works`, `where-scrap-goes`, `warranty`, `impact` (+ `WasteHotspots.tsx`), `contact` | Info pages                                                                    |
| `(site)/privacy`, `(site)/terms`                                                                   | Legal pages                                                                   |
| `api/shop-submissions/route.ts`                                                                    | Server route that saves verified shop owners' items (service-role key) (new)  |
| `hub/layout.tsx`, `hub/page.tsx`                                                                   | Staff hub shell and dashboard                                                 |
| `hub/intake`, `hub/items`, `hub/items/[id]`, `hub/partners`, `hub/handovers`, `hub/data`           | Intake, items, item detail, shops & institutions, handovers, backup & publish |

### frontend/src/ (code)

| Path                                                                          | Purpose                                                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `components/brand/Logo.tsx`                                                   | Logo                                                                                                   |
| `components/layout/*`                                                         | Header (+ search, Account button), footer, mobile nav, nav links, skip link                            |
| `components/legal/LegalPage.tsx`                                              | Shared layout for the legal pages                                                                      |
| `components/marketing/*`                                                      | Home page sections (hero, grade strip, loop steps, CTA banner)                                         |
| `components/ui/*`                                                             | Button, Container, EmptyState, Eyebrow, SectionHeading                                                 |
| `config/business-rules.ts`                                                    | The only source of business numbers (grades, buy %, warranty)                                          |
| `data/shop-snapshot.json`                                                     | Stock exported by the hub. The shop page no longer reads it; still used by the hub data page and tests |
| `features/hub/*`                                                              | Hub screens, checklists, photo handling, `useHubData` hook                                             |
| `features/inventory/model.ts`, `ids.ts`, `rules.ts`, `pricing.ts`, `stats.ts` | Inventory types, RL-JMU ids, stock rules, buy-price calculation, dashboard stats                       |
| `features/inventory/store/index.ts`, `store/local.ts`                         | Data access layer (browser storage today)                                                              |
| `features/inventory/components/GradeBadge.tsx`, `ItemVisual.tsx`              | Grade badge, item photo or placeholder                                                                 |
| `features/inventory/*.test.ts`, `test-helpers.ts`                             | Unit tests                                                                                             |
| `features/sell/components/*`                                                  | Request form, WhatsApp/email handoff panel, reserve button, sell header, shop submission form          |
| `features/sell/handoff.ts`                                                    | Builds the WhatsApp/email messages                                                                     |
| `features/shop/model.ts`, `queries.ts`                                        | Shop item schema and filters; Supabase reads                                                           |
| `features/shop/components/*`                                                  | Item card and grid, filter bar, grade chips, sample-stock notice                                       |
| `lib/auth-client.ts`                                                          | Supabase Auth calls from the browser and the `localStorage` session (new)                              |
| `lib/site.ts`, `lib/env.ts`                                                   | Site constants (WhatsApp, email), env parsing                                                          |
| `lib/utils/*`                                                                 | `cn`, money formatting, slugify (+ tests)                                                              |

### frontend/tests/e2e/

| File                    | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `accessibility.spec.ts` | Accessibility (axe) checks per page                       |
| `console.spec.ts`       | No console errors; checks the copy for unsupported claims |
| `hub.spec.ts`           | Hub flows                                                 |
| `shop.spec.ts`          | Shop and sell flows                                       |

## 4. Supabase values in the code

**No Supabase URL or key value is hardcoded anywhere in the current code.** Every one is read from environment variables:

| Env var                                                           | Read in                                                                                                      | Exposure                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                        | `src/lib/auth-client.ts`, `src/features/shop/queries.ts`, `src/app/api/shop-submissions/route.ts` (fallback) | Public (browser)              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the anon/publishable key) | `src/lib/auth-client.ts`, `src/features/shop/queries.ts`                                                     | Public (browser)              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy fallback name)            | `src/features/shop/queries.ts`                                                                               | Public (browser)              |
| `SUPABASE_URL`                                                    | `src/app/api/shop-submissions/route.ts`                                                                      | Server only                   |
| `SUPABASE_SERVICE_ROLE_KEY`                                       | `src/app/api/shop-submissions/route.ts`                                                                      | Server only, must stay secret |

Things to be aware of:

- The variable names are documented, without values, in `frontend/.env.example`, `docs/team-setup.md` and `ACCOUNT_SETUP.md`.
- The names don't match. `.env.example` and `team-setup.md` call the server key `SUPABASE_SECRET_KEY`, but the code reads `SUPABASE_SERVICE_ROLE_KEY`.
- No `.env` or `.env.local` file exists locally. The real values live only in Vercel's environment settings.
- I searched the git history for JWT-style keys (`eyJ…`) and `sb_publishable_` / `sb_secret_` keys and found none.
- The only `*.supabase.co` URL ever committed was a placeholder in a test file in `39f28da`, and it was removed in `2e3ea0c`.

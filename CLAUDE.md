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

## Current state (2026-10-13)

Latest health check: `docs/health-check-2026-10-13.md`.

- **The Business Plan is the source of truth** (ADR 0004).
  - ReLoop buys stock outright (purchase-only: no consignment, no self-listing), grades it A–D at one Jammu hub and resells it.
  - Numbers come only from `frontend/src/config/business-rules.ts`, summarised in `docs/business-rules.md`.
- **Stack:** Next.js 16 on Vercel, with a **live Supabase project connected through the Vercel Marketplace integration** (AWS `ap-south-1`, Mumbai).
  - Every Vercel variable is marked Sensitive, so the CLI can't read values back.
  - The code reads `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, the last server-only.
- **Preview deployments share the production database.** Preview has the same Supabase and Postgres credentials as Production.
  - Never run e2e tests, seeds or migrations against a preview or production.
  - Development has no variables, so `next build` (and so `npm run test:e2e`) currently fails locally. It needs the Supabase variables to prerender `/shop/[itemId]`.
- **Public site:**
  - Pages: home, `/shop` (+ `/shop/[RL-JMU-id]`), `/sell` (shops, institutions), how-it-works, where-scrap-goes, warranty, impact, contact, legal.
  - Accounts: `/register`, `/login`, `/account`.
  - The shop reads the live `listings` and `categories` tables (`frontend/src/features/shop/queries.ts`).
  - Institution forms hand off to WhatsApp or email (`SITE.whatsapp` / `SITE.supportEmail` in `frontend/src/lib/site.ts`).
- **Accounts and verification:**
  - Sign-up is Supabase Auth with the role `buyer` or `shop_owner`; the browser session is kept in `localStorage`.
  - **Email confirmation is off** (`mailer_autoconfirm: true`).
  - Shop owners must give a GSTIN. The form and the sign-up trigger check its format only; nothing checks it's real.
  - New shop owners are `pending`. Only a verified shop owner can submit items, through `/api/shop-submissions`, which checks the session and verification on the server before using the service-role key.
  - Verification is set by hand in Supabase; there is no admin screen.
- **Staff hub:** `/hub` (dashboard, intake, items, shops & institutions, handovers, backup & publish) stores its data **in each browser only**. It has no login and is not connected to Supabase.
- **Schema drift:**
  - The live database has `listings`, `categories`, `profiles`, `shop_owners` and `shop_submissions`, created by hand outside `backend/supabase/migrations/`.
  - The repo's hub tables (`items`, `item_events` and the rest) do not exist live.
  - The 16 PGlite backend tests fail at setup, because migration `20261011000001` alters tables no migration creates.
  - RLS, policy and grant findings are in the health check.
- Pushing to `main` deploys to production through Vercel. Work on a branch and open a PR.

## Working rules

- Run `npm run check` and `npm run test:e2e` from the repo root before calling work done.
- Every DB change is a new file in `backend/supabase/migrations/` with a test in `backend/tests/`.
- Never put unsupported claims on the public site (authorisations, certifications, India-wide shipping, internal financials); the e2e copy test enforces this.
- Build one roadmap phase at a time, on its own branch. The user reviews each phase before merging and before the next one starts.
- Never commit secrets or `.env` files. Commit locally, and push only when the user asks.

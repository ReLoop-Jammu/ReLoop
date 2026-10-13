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

## Current state (2026-10-07)

- **The Business Plan is the source of truth** (ADR 0004). ReLoop buys stock, grades it A–D at one Jammu hub and resells it. Numbers come only from `frontend/src/config/business-rules.ts` (summarised in `docs/business-rules.md`). The gap analysis and open questions are in `docs/business-plan-alignment.md`.
- **Public site:** home, `/shop` (+ `/shop/[RL-JMU-id]`), `/sell` (shops, institutions, households with an estimator, consignment, list-yourself), how-it-works, where-scrap-goes, warranty, impact, contact, legal.
- **Staff hub:** `/hub` (dashboard, intake, items, shops & institutions, handovers, backup & publish). It runs in the browser, so its data is per device.
- **Accounts and forms use Supabase; the hub data is still per device.** Sign-up, login and logout go through `frontend/src/app/api/auth/*`, which keep the session in HttpOnly cookies (ADR 0005); the browser never holds a token. `/hub` needs a signed-in user listed in `public.staff`. Without Supabase it stays locked, unless `INSECURE_OPEN_HUB=true` (local dev and e2e only). Hub items still live in browser storage through `frontend/src/features/inventory/store` (Supabase adapter is the next phase).
- **The shop** reads live stock from the `items` table (anonymous, RLS-limited to items on sale) and falls back to `frontend/src/data/shop-snapshot.json` if Supabase is not connected or unreachable. Shipping, warranty and wipe status come from the item itself and `business-rules.ts`, never assumed.
- **Public endpoints** (`/api/institution-submissions`, `/api/shop-submissions`, `/api/auth/*`) check origin, use a honeypot, validate with zod (`frontend/src/lib/validation.ts`) and rate-limit (in-process plus `public.hit_rate_limit`). Keep new endpoints to the same pattern.
- Business details (contact, legal name, grievance officer) come from `NEXT_PUBLIC_*` variables read in `frontend/src/lib/site.ts`; see `frontend/.env.example`.
- `backend/` holds the Supabase schema (migrations in order, tested with PGlite). It is not yet applied to a live project; steps are in `backend/README.md` and `ACCOUNT_SETUP.md`.
- Pushing to `main` deploys to production through Vercel. Work on a branch and open a PR.

## Working rules

- Run `npm run check` and `npm run test:e2e` from the repo root before calling work done.
- Every DB change is a new file in `backend/supabase/migrations/` with a test in `backend/tests/`.
- Never put unsupported claims on the public site (authorisations, certifications, India-wide shipping, internal financials); the e2e copy test enforces this.
- Build one roadmap phase at a time, on its own branch. The user reviews each phase before merging and before the next one starts.
- Never commit secrets or `.env` files. Commit locally, and push only when the user asks.

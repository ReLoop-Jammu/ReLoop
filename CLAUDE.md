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

## Current state

- **Phases 1–2 are done** on branch `phase-1-foundation`: a redesigned site with home, listings (search, filters and sort in the URL), listing detail, impact, how-it-works and sell pages.
- **Phase 3 (backend half) is done:** the schema, hybrid moderation trigger, RLS, storage policies and seed are in `backend/`, with 20 passing tests. It is **not yet connected to a live Supabase project**. The frontend still reads sample data from `frontend/src/features/listings/seed-data.ts` via `queries.ts`; swapping those query bodies to Supabase is the remaining Phase 3 work.
- Inquiries, basket, saved items and selling are not built in the UI yet (Phases 4–6).

## Working rules

- Run `npm run check` and `npm run test:e2e` from the repo root before calling work done.
- Every DB change is a new file in `backend/supabase/migrations/` with a test in `backend/tests/`.
- Build one roadmap phase at a time, on its own branch. The user reviews each phase before merging and before the next one starts.
- Never commit secrets or `.env` files. Commit locally, and push only when the user asks.

@AGENTS.md

# ReLoop

E-waste / used-electronics marketplace, starting in Jammu and selling across India.

## Read first, and follow

- **[docs/architecture.md](docs/architecture.md)**: stack, repo structure, roles, data model, routes, design system and phased roadmap.
- **[docs/engineering-standards.md](docs/engineering-standards.md)**: mandatory code, security, testing and workflow rules.
- **[docs/adr/](docs/adr/)**: why the key decisions were made. Changing a decision means writing a new ADR.

## Current state

- **Phases 1–2 are done** on branch `phase-1-foundation`: a Next.js 16 + TypeScript + Tailwind v4 app with home, listings (search, filters and sort in the URL), listing detail, impact, how-it-works and sell pages.
- **No backend yet.** Listings come from `src/features/listings/seed-data.ts` via `src/features/listings/queries.ts`, the only file pages read listings from. Phase 3 swaps its bodies for Supabase queries. Supabase, auth and Vercel are NOT set up yet.
- Inquiries, basket, saved items and selling are not built in the new app yet (Phases 4–6). The old prototype `index.html` still has localStorage versions of them for reference.

## Working rules

- Run `npm run check` and `npm run test:e2e` before calling work done.
- Build one roadmap phase at a time, on its own branch. The user reviews each phase before merging and before the next one starts.
- Never commit secrets or `.env` files. Commit locally, and push only when the user asks.

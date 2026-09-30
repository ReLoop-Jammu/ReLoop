# ReLoop

E-waste / used-electronics marketplace, starting in Jammu and selling across India.

## Read first, and follow
- **[docs/architecture.md](docs/architecture.md)**: stack, repo structure, roles, data model, routes, design system and phased roadmap.
- **[docs/engineering-standards.md](docs/engineering-standards.md)**: mandatory code, security, testing and workflow rules.
- **[docs/adr/](docs/adr/)**: why the key decisions were made. Changing a decision means writing a new ADR.

## Current state
- **Phase 0 (architecture sign-off).** No Next.js app exists yet, and there is no backend. Supabase, Vercel and auth are planned but not set up, so don't assume they exist.
- The live site is still the single-file prototype `index.html` (plain HTML/CSS/JS). Its data lives in browser localStorage, and all reads and writes go through the `DATA LAYER` block at the top of its main `<script>`. Listing photos there are preview-only.
- Earlier prototype plan: `docs/frontend-improvements-plan.md`.

## Working rules
- Build one roadmap phase at a time, on its own branch. The user reviews each phase before merging and before the next one starts.
- Never commit secrets or `.env` files. Commit locally, and push only when the user asks.

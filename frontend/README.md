# ReLoop frontend

The ReLoop website: Next.js 16 (App Router), TypeScript and Tailwind CSS v4.

```
src/
├─ app/            # Routes only: pages, layouts, metadata, sitemap
├─ components/     # Shared UI: ui/ (buttons, headings), layout/ (header, footer), marketing/, brand/
├─ features/       # One folder per domain. listings/ = model, queries, components
└─ lib/            # env validation and small utilities (money, slugify, cn)
```

**Rule:** pages never fetch data directly. They call `features/*/queries.ts`, which is the only code that knows where data comes from (sample data today, Supabase from Phase 3).

Design tokens (colours, fonts, shadows) live in `src/app/globals.css`. Components use the token names (`bg-surface`, `text-ink-soft`, `bg-brand-600`), never raw hex values.

Run commands from the repo root (`npm run dev`, `npm run check`) or here with `npm run <script>`.

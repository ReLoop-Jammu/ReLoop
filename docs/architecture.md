# ReLoop — Architecture

_Status: Updated 2026-10-07 for the business plan ([ADR 0004](adr/0004-reloop-owned-graded-inventory.md)). Business numbers: [business-rules.md](business-rules.md). Gap analysis and open questions: [business-plan-alignment.md](business-plan-alignment.md)._

## Context

ReLoop is currently one ~200KB `index.html` (plain HTML/CSS/JS, localStorage "data layer", no backend). The goal is a real, production-grade marketplace for used electronics / e-waste, starting in Jammu and selling across India. Before any code, we fix the architecture, the data model, the standards and a phased roadmap, and the user signs off. After that, we build it in parts, one phase at a time, each phase reviewed before the next.

**Decisions already made by the user**

- Stack: **Next.js + TypeScript**, deployed on **Vercel**, **Supabase** for database/auth/storage.
- Business model: **ReLoop buys and grades its own stock** at one Jammu hub ([ADR 0004](adr/0004-reloop-owned-graded-inventory.md), which replaced the earlier hybrid marketplace).
- Buying: **inquiries now, online payments later**. Architecture leaves a clean slot for Razorpay.
- Roles: left to me (see §3).

**Related docs**

- Engineering standards: [engineering-standards.md](engineering-standards.md) (mandatory for all code)
- Decisions: [adr/](adr/)

---

## 1. Tech stack (versions pinned at scaffold time)

| Concern            | Choice                                                             | Why                                                                   |
| ------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Framework          | Next.js (App Router, latest stable), React Server Components       | SEO for listing pages, server-side auth checks, first-class on Vercel |
| Language           | TypeScript `strict`                                                | Catches bugs before runtime                                           |
| Styling            | Tailwind CSS v4 + CSS variables for design tokens                  | Consistent design system, small CSS                                   |
| UI primitives      | shadcn/ui (Radix-based, accessible)                                | Accessible dialogs, menus and forms that we own in-repo               |
| Forms / validation | React Hook Form + **Zod** (one schema shared by client and server) | Same rules everywhere                                                 |
| Backend            | Supabase: Postgres, Auth, Storage, Row Level Security              | Managed database with security rules enforced in the DB               |
| DB access          | `@supabase/ssr` clients + generated TypeScript types               | Type-safe queries                                                     |
| Email              | Resend (Phase 6)                                                   | Inquiry and moderation notifications                                  |
| Bot protection     | Cloudflare Turnstile on public forms                               | Stops spam inquiries and signups                                      |
| Hosting            | Vercel (preview per PR, production on `main`)                      | Zero-config for Next.js                                               |
| Testing            | Vitest (unit), Playwright (end-to-end), SQL tests for RLS          | See §7                                                                |
| Tooling            | npm, ESLint, Prettier, Husky + lint-staged, commitlint             | Enforced standards (npm over pnpm: ships with Node, one less tool)    |
| Monitoring         | Vercel Analytics + Speed Insights; Sentry for errors               | Know when things break                                                |
| Payments (later)   | Razorpay                                                           | India-first (UPI, cards)                                              |

## 2. Repository structure

Frontend and backend live in separate top-level folders (npm workspaces):

```
reloop/
├─ frontend/                     # The website (Next.js), deployed to Vercel with Root Directory = frontend
│  ├─ src/
│  │  ├─ app/                    # routes only; thin, compose features
│  │  │  ├─ (site)/ shop/, sell/, how-it-works/, where-scrap-goes/, warranty/, impact/, legal …
│  │  │  ├─ hub/      staff tool: dashboard, intake, items, partners, handovers, data
│  │  │  ├─ hub/login                                        (step 3, with Supabase)
│  │  │  └─ layout.tsx, error.tsx, not-found.tsx, sitemap.ts, robots.ts
│  │  ├─ features/               # one folder per domain; the ONLY code that fetches data
│  │  │  ├─ inventory/ { model.ts, pricing.ts, rules.ts, stats.ts, store/ (the data layer) }
│  │  │  ├─ shop/      { model.ts, queries.ts, components/ }
│  │  │  ├─ sell/      { handoff.ts, components/ (forms, estimator) }
│  │  │  └─ hub/       { components/, checklists.ts, useHubData.ts }
│  │  ├─ config/business-rules.ts   # every number from the business plan
│  │  ├─ data/shop-snapshot.json    # stock published from the hub (until Supabase)
│  │  ├─ components/ { ui/, layout/, marketing/, brand/ }
│  │  └─ lib/ { env.ts, utils/, supabase/ (Phase 3) }
│  ├─ public/                    # static images
│  └─ tests/e2e/                 # Playwright browser tests (desktop + mobile)
├─ backend/                      # The database, as code
│  ├─ supabase/
│  │  ├─ config.toml
│  │  ├─ migrations/             # schema, triggers, RLS policies, storage bucket
│  │  └─ seed.sql                # local sample data
│  └─ tests/                     # runs migrations in PGlite and checks every security rule
├─ docs/ { architecture.md, engineering-standards.md, adr/ }
├─ legacy/index.html             # original prototype, reference only
└─ package.json                  # workspace root: shared tooling (prettier, husky, commitlint)
```

**Principle:** UI code never talks to the database directly. Reads go through `features/*/queries.ts` and writes go through `features/*/actions.ts` (Server Actions, Zod-validated). Security is enforced in `backend/` (RLS and triggers), so a UI bug cannot leak or publish data.

## 3. Users & roles

| Role          | Who          | Can                                                                                                  |
| ------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| **Visitor**   | anyone       | Browse the shop, reserve an item, use the price estimator, send a sell-to-us request                 |
| **Hub staff** | ReLoop team  | Everything in `/hub`: intake, grading, listing, repairs, stripping, scrap cage, handovers, dashboard |
| **Admin**     | ReLoop leads | Staff, plus adding or removing staff                                                                 |

Sellers (shops, institutions, households) don't have accounts. They sell **to** ReLoop and are recorded by staff as partners, institutions or the item's source. Buyer accounts are not planned for the pilot.

## 4. Data model

Defined in `backend/supabase/migrations/` and described in `backend/README.md`:

- **Items:** RL-JMU tags, grade A–D, status, prices, wipe, source
- **Item history**
- **Partners and institutions**
- **Repair jobs**
- **Consignments**
- **Recycler handovers**
- **Public requests**
- **Staff**

Business rules (no selling without a wipe, the day-45/75 rules, public-only columns) are enforced in the database. The browser-storage version used until Supabase is connected has the same shape: `frontend/src/features/inventory/model.ts`.

## 5. Pages / routes

- **Public:**
  - `/`, `/shop`, `/shop/[RL-JMU-id]`
  - `/sell` (+ `/sell/shops`, `/sell/institutions`, `/sell/home`, `/sell/consignment`, `/sell/list-yourself`)
  - `/how-it-works`, `/where-scrap-goes`, `/warranty`, `/impact`, `/contact`, `/privacy`, `/terms`
- **Staff (noindex, not linked):** `/hub` (dashboard), `/hub/intake`, `/hub/items`, `/hub/items/[id]`, `/hub/partners`, `/hub/handovers`, `/hub/data`
- **Later:** `/hub/login` once Supabase auth is connected

## 6. Design system

- **Tokens** (in `frontend/src/app/globals.css`): brand blue scale (`brand-50…950`, main `brand-600 #1E6B9E`), gold accent (`gold-100…700`, main `gold-500 #E8B83A`), warm neutrals (`canvas`, `surface`, `sunken`, `line`, `ink`, `ink-soft`, `muted`), colour-coded condition badges (`condition-working`, `-tested`, `-repairable`, `-parts`, `-eol`) and category tints (`cat-devices` … `cat-recycling`). Fonts: Bricolage Grotesque for headings, Inter for text, both via `next/font`. Icons: lucide-react. Components use token names, never raw hex.
- **Components:** shared components are built once and reused: ListingCard, ListingGrid, FilterBar, EmptyState, PhotoUploader, StatusBadge, ContactPanel, Dialog, Toast, FormField.
- **Rules:** mobile-first; WCAG 2.2 AA (contrast, keyboard access, visible focus, labelled fields); honour `prefers-reduced-motion`; no autoplay media; motion is subtle and purposeful.
- The brand colours (blue + gold on warm off-white) are kept; the layout and components were redesigned rather than copied from the prototype.

## 7. Engineering standards

Moved to [engineering-standards.md](engineering-standards.md). They are mandatory.

## 8. Roadmap (each step = one PR, reviewed before merge)

| #   | Step                                                | Delivers                                                                                                                                                            | Status                                                |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 0   | Docs                                                | Architecture, standards, ADRs                                                                                                                                       | Done                                                  |
| 1   | Foundation                                          | Next.js app, tooling, CI, design system                                                                                                                             | Done                                                  |
| 2   | Public pages                                        | Redesigned site                                                                                                                                                     | Done                                                  |
| 2b  | **Business-plan alignment**                         | Graded shop, Sell to us paths with estimator, warranty/scrap pages, staff hub on browser storage, Supabase schema rewritten                                         | In review (PR #11)                                    |
| 3   | **Connect Supabase** (needs the teammate's project) | Supabase adapter for `features/inventory/store`, staff login for `/hub`, shop reads live stock, forms save to `submissions`, photos in storage, daily pg_cron rules | Next                                                  |
| 4   | Launch prep                                         | Contact details, hub address, domain, legal review of privacy/terms, notify staff of new requests (email/WhatsApp)                                                  | Before go-live                                        |
| 5   | Operations extras                                   | Consignment and repair dashboards, printable handover sheets, Instagram feed of new stock                                                                           | After the pilot starts                                |
| 6   | Self-listing (8%)                                   | Seller accounts, moderation, payouts                                                                                                                                | Later, needs a decision (does it go through the hub?) |
| 7   | Payments                                            | Razorpay, receipts, GST                                                                                                                                             | Later, separate plan                                  |

## 9. Things to confirm during Phase 0 review (have sensible defaults; not blockers)

- Login methods: email magic link + Google (default). Phone OTP costs money per SMS, so it's deferred.
- Domain name for production.
- English only at launch; the structure allows adding Hindi later.
- Who the first admin account(s) are.

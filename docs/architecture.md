# ReLoop — Architecture

_Status: Phases 1–2 built, and the Phase 3 database schema is written and tested (on branch `phase-1-foundation`, awaiting review). Last updated 2026-09-30._

## Context

ReLoop is currently one ~200KB `index.html` (plain HTML/CSS/JS, localStorage "data layer", no backend). The goal is a real, production-grade marketplace for used electronics / e-waste, starting in Jammu and selling across India. Before any code, we fix the architecture, the data model, the standards and a phased roadmap, and the user signs off. After that, we build it in parts, one phase at a time, each phase reviewed before the next.

**Decisions already made by the user**

- Stack: **Next.js + TypeScript**, deployed on **Vercel**, **Supabase** for database/auth/storage.
- Marketplace model: **Hybrid**. Verified business/collection partners publish directly; individual sellers' listings go to ReLoop admin review first.
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
│  │  │  ├─ listings/, impact/, how-it-works/, sell/        (built)
│  │  │  ├─ (auth)/, account/, admin/                       (Phases 4–6)
│  │  │  └─ layout.tsx, error.tsx, not-found.tsx, sitemap.ts, robots.ts
│  │  ├─ features/               # one folder per domain; the ONLY code that fetches data
│  │  │  └─ listings/ { model.ts, queries.ts, seed-data.ts, components/ }
│  │  │     (inquiries/, basket/, saved/, partners/, moderation/ added per phase)
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

| Role        | Who                                                     | Can                                                                                                                              |
| ----------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Visitor** | not logged in                                           | Browse, search, view listings, send an inquiry (with Turnstile)                                                                  |
| **Member**  | any signed-up user                                      | Everything above, plus save listings, keep a basket, see their inquiry history, **list items as an individual** (goes to review) |
| **Partner** | member whose business profile is **verified** by ReLoop | Everything above, plus listings **publish immediately**, a business profile page and bulk lots                                   |
| **Admin**   | ReLoop staff                                            | Review queue, approve/reject listings, verify partners, manage inquiries, users and audit log                                    |

One login system. "Partner" is not a separate account type; it is a verified organization linked to a member. That keeps auth simple and lets a person be both a buyer and a seller.

## 4. Data model (Postgres, all tables have RLS on)

- **profiles**: `id` (= auth user), `full_name`, `phone`, `is_admin`, timestamps
- **organizations**: `id`, `owner_id`, `name`, `type` (business/college/collector/recycler), `gstin?`, `city`, `verification_status` (pending/verified/rejected), `verified_by`, `verified_at`
- **listings**: `id`, `slug`, `seller_id`, `organization_id?`, `title`, `category` (enum: devices/components/repairable/bulk_lots/recycling), `condition` (enum: working/tested/repairable/parts_only/end_of_life), `price_paise` (bigint; `null` = request quote), `quantity`, `city`, `description`, **`status`** (draft/pending_review/published/rejected/sold/archived), `rejection_reason?`, `published_at`, `search` (tsvector for full-text search), timestamps
- **listing_photos**: `listing_id`, `storage_path`, `position`, `width`, `height` (files in the Supabase Storage bucket `listing-photos`)
- **saved_listings**: (`user_id`, `listing_id`)
- **basket_items**: (`user_id`, `listing_id`, `qty`). Guests keep a localStorage basket that merges into this on login.
- **inquiries**: `id`, `listing_id`, `buyer_id?`, `name`, `contact`, `message`, `status` (new/contacted/closed), `handled_by?`, timestamps
- **audit_log**: `actor_id`, `action`, `entity`, `entity_id`, `details` (jsonb), `created_at`, written on every moderation/verification action
- **Later (payments phase):** `orders`, `order_items`, `payments` (Razorpay ids, webhook-verified)

**Hybrid rule, enforced in the database** (not just the UI): a Postgres trigger on listing submit sets `status = 'published'` if the seller's organization is verified, otherwise `'pending_review'`. It can't be bypassed from the browser.

**Key RLS rules:** anyone reads `published` listings; sellers read and write only their own listings; only admins change `status` to published/rejected; inquiries are visible only to the buyer who sent them and to admins; the service-role key is never exposed to the browser.

## 5. Pages / routes

- **Public:** `/`, `/listings` (search, filters and sort in the URL so results are shareable), `/listings/[slug]`, `/categories/[category]`, `/partners/[slug]`, `/impact`, `/how-it-works`, `/privacy`, `/terms`
- **Auth:** `/login`, `/signup` (email magic link + Google), `/auth/callback`
- **Account:** `/account` (profile), `/account/saved`, `/account/basket`, `/account/inquiries`, `/account/listings`, `/account/listings/new`, `/account/listings/[id]/edit`, `/account/partner` (apply for verification)
- **Admin:** `/admin` (counts dashboard), `/admin/review` (listing queue), `/admin/inquiries`, `/admin/partners`, `/admin/users`, `/admin/audit`

## 6. Design system

- **Tokens** (in `frontend/src/app/globals.css`): brand blue scale (`brand-50…950`, main `brand-600 #1E6B9E`), gold accent (`gold-100…700`, main `gold-500 #E8B83A`), warm neutrals (`canvas`, `surface`, `sunken`, `line`, `ink`, `ink-soft`, `muted`), colour-coded condition badges (`condition-working`, `-tested`, `-repairable`, `-parts`, `-eol`) and category tints (`cat-devices` … `cat-recycling`). Fonts: Bricolage Grotesque for headings, Inter for text, both via `next/font`. Icons: lucide-react. Components use token names, never raw hex.
- **Components:** shared components are built once and reused: ListingCard, ListingGrid, FilterBar, EmptyState, PhotoUploader, StatusBadge, ContactPanel, Dialog, Toast, FormField.
- **Rules:** mobile-first; WCAG 2.2 AA (contrast, keyboard access, visible focus, labelled fields); honour `prefers-reduced-motion`; no autoplay media; motion is subtle and purposeful.
- The brand colours (blue + gold on warm off-white) are kept; the layout and components were redesigned rather than copied from the prototype.

## 7. Engineering standards

Moved to [engineering-standards.md](engineering-standards.md). They are mandatory.

## 8. Phased roadmap (each phase = one PR, reviewed before the next)

| #   | Phase                             | Delivers                                                                    | Done when                                              |
| --- | --------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| 0   | **Docs sign-off**                 | architecture, standards, ADRs, CLAUDE.md                                    | User approves docs                                     |
| 1   | **Foundation**                    | Next.js scaffold, tooling, CI, design tokens, Header/Footer, Vercel preview | Empty branded shell deploys; CI green                  |
| 2   | **Static pages port**             | Home, Impact, How-it-works ported from `index.html`, mobile-polished        | Visual parity + Lighthouse ≥ 90                        |
| 3   | **Supabase + marketplace (read)** | Schema, RLS, seed data, listings grid, filters/search, detail pages         | Browse/search works from the real DB                   |
| 4   | **Auth & accounts**               | Sign up/in, profile, saved listings, basket (with guest merge)              | E2E: sign up → save → basket                           |
| 5   | **Selling**                       | Create/edit listing, photo upload, hybrid rule, "my listings"               | E2E: individual → pending; partner → live              |
| 6   | **Inquiries + admin console**     | Inquiry flow, review queue, partner verification, audit log, emails         | E2E: submit → approve → visible; inquiry → admin inbox |
| 7   | **Launch hardening**              | SEO, a11y audit, security headers, legal pages, analytics, custom domain    | Launch checklist passes                                |
| 8   | **Payments (later)**              | Razorpay checkout, orders, webhooks                                         | Separate plan when we get there                        |

`index.html` stays live as the current site until Phase 2 replaces it.

## 9. Things to confirm during Phase 0 review (have sensible defaults; not blockers)

- Login methods: email magic link + Google (default). Phone OTP costs money per SMS, so it's deferred.
- Domain name for production.
- English only at launch; the structure allows adding Hindi later.
- Who the first admin account(s) are.

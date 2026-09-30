# ReLoop — Engineering Standards

These rules apply to every change. A PR that breaks one is not merged until it is fixed or the rule is changed via an ADR.

See also: [architecture.md](architecture.md) · [adr/](adr/)

## Code quality
- TypeScript strict, no `any`, no `@ts-ignore` without a reason comment. Server Components by default; `"use client"` only where interactivity needs it.
- Every input is validated with Zod on the server, even if the client already validated it. Money is stored as integer paise and formatted only at display.
- Small files, one responsibility each; features don't import from each other's internals. Names are descriptive; comments explain *why*, not what.
- Errors: user-facing messages are friendly; technical detail goes to logs and Sentry. Every route has loading, error and empty states.

## Security
- RLS on every table, with a test proving each policy. Secrets only in Vercel env vars; `.env*` is git-ignored and `.env.example` is committed. `lib/env.ts` validates env vars at startup.
- Uploads are limited to 5 MB and 8 photos, JPEG/PNG/WebP only, and go to the user's own folder via storage policies.
- Turnstile and rate limiting on inquiry/signup; security headers (CSP etc.) in `next.config`.

## Performance & SEO
 `next/image` for all photos; cache published listing pages and revalidate on change; target Lighthouse ≥ 90 on mobile for Performance, Accessibility, Best Practices and SEO; metadata, Open Graph images, `sitemap.xml` and structured data for listings.

## Testing (definition of "tested")
- Unit: Zod schemas, utils, hybrid-rule logic.
- RLS: SQL tests that each role can and can't do the right things.
- E2E (Playwright), critical paths: browse → filter → view; sign up → list item → admin approves → item visible; send inquiry → admin sees it; partner lists → instantly visible.
- CI blocks merge if lint, typecheck or tests fail.

## Workflow
- One branch per phase/feature → Pull Request → Vercel preview URL → user reviews → merge. Nothing is merged to `main` without the user's review.
- Conventional commits (`feat:`, `fix:`, `docs:`…). Every DB change is a migration file; never edit production by hand.
- PR checklist: tests pass, mobile checked, a11y checked, no secrets, docs/ADR updated if a decision changed.

## Compliance (India)
- Privacy policy and consent in line with the DPDP Act 2023: collect minimal personal data and let users delete their account.
- E-Waste (Management) Rules 2022: the "Recycling" category routes only to authorised recyclers, with a disclaimer on listings.

## Design rules
See [architecture.md §6](architecture.md#6-design-system). In short: mobile-first, WCAG 2.2 AA, design tokens only (no hard-coded colours), honour reduced motion, no autoplay media.

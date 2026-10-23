# Changelog

All notable changes to ReLoop, the used-electronics loop for the Jammu pilot. Dates are in India time.

## v1.1.0 (2026-10-23): faculty feedback, plain language and Hindi

- **Items named everywhere** instead of "electronics": mobile phones, laptops, desktop computers and computer monitors; parts (screens, lithium batteries, motherboards and phone boards, cameras, charging ports, keyboards); not accepted (TVs, printers, UPS units, small appliances, lead-acid batteries). One list in `frontend/src/config/items.ts`. The shop-submission form offers only what we buy.
- **Home:** one plain sentence as the heading, two choices ("Buy a tested phone or laptop", "Sell your shop's old devices and parts"), and item-category cards (Lucide icons, ISC licence) that open the shop filtered.
- **One numbered-steps component** (`components/marketing/Steps.tsx`) on `/sell`, `/sell/shops`, `/sell/institutions`, a "How to buy" block on `/shop` and the home loop. The shop steps show when each payment is made: scrap on the spot (UPI), devices after testing (offer), working parts after testing (next visit).
- **Plain words:** licensed recycler (VRRG Group, Gangyal), item number, item history, our test report, used part (tested and working), used parts shop, our scrap prices (per kg), list of scrap sent for recycling, download our figures, usual price range for this model. No URL, `/go/*` link or printed QR target changed.
- **English / हिन्दी switch** in the top bar, remembered in the visitor's browser; Hindi versions of the home page, `/sell`, `/sell/shops`, `/sell/institutions` and the How to buy steps. Other pages show a short Hindi note that they are mostly in English.
- WhatsApp help is a link in the footer of every page, next to Report a problem.
- Tests: new `tests/e2e/plain-language.spec.ts` (switch, Hindi claims scan, steps, help links on every page); unit tests for the item lists, the switch and the steps.

## v1.0.0 (2026-10-15, release candidate on `release/v1`)

The release that brings the site and hub to Business Plan v2. It is built and tested as code; applying the migrations, merging to `main` and tagging are done from a local session (`scripts/finish-v1-local.md`).

### Business Plan v2 (batch 15b)

- Scrap is bought by weight at a public rate card (`/rate-card`), weighed at the shop's counter and paid by UPI, with a numbered receipt on a private link (`/receipt/[token]`).
- A kilo ledger with five bins (screens, boards, other, D devices, batteries) and per-bin handovers to VRRG Group, our dismantling partner.
- The Parts Exchange: partner shops list tested parts; ReLoop tests and sells them, keeps a 12% commission and pays the shop after the 7-day return window.
- Institution lots with a published lot fee, equipment on its own receipt and the dead e-waste handed over in the institution's name.
- New stock rules: a part unsold for 30 days is cut by 25% once; an A or B device unsold for 45 days becomes grade C and is stripped.
- Ownership confirmation at every purchase and a data wipe before stripping, from launch dates held in staff settings.
- Households, televisions, printers, UPS units, small appliances, consignment and shipping outside Jammu removed (old rows kept, new ones blocked).
- Staff-only finance and VRRG settings; every plan money figure stays out of the repository.

### Impact and network (batch 16)

- `/impact` rebuilt: Jammu-only framing, server-drawn Sankey diagrams of scrap (kg) and devices and parts (items), month-by-month bars, standards and pilot targets.
- `/network`: a map of flows from Jammu's markets to the hub and on to VRRG Group (loaded when scrolled into view), buyer areas and kg by bin. Markets with fewer than three shops are merged; buyer areas need three items.
- Staff record the buyer's area at the point of sale.

### Redesign and wording (batches 17 to 19)

- Home: a trust strip (Bought, Tested, Wiped, Graded, Listed) and a sketch of the Jammu loop.
- Error pages keep the header and footer; a page for when the whole site fails; loading skeletons where they cannot hide a 404.
- The hub opening date appears only on the locations and contact pages; the claims scan covers every public route.
- Hub: a "Today at the hub" panel, a skip link and "/" to search.

### Route, repairs, capacity and records (batches 20 and 21)

- `/hub/route`: Tuesday and Friday run sheets in driving order, booked lots marked collected or missed (missed ones move to the next route day), a weigh-in link per stop, printable.
- `/hub/repairs`: items out with repair partners, days out, the agreed fee, back fixed or not fixable.
- `/hub/capacity`: bins against 100 kg (alert from 80 kg), the weekly battery cabinet with count, condition and reused batteries, device racks (no percentage until the slots are counted), the parts shelf and stock age bands.
- A "Handover record" PDF for each institution lot: tags bought and the partner's weight receipt, no prices.

### Staff pricing (batch 22)

- `/hub/pricing` (staff only): buy against sale, COGS (buy + repairs + handling), days to sell and sell-through by category and grade; flags only against the plan's unit figures; a margins CSV without supplier contacts.
- A suggested price at intake from the freshest price reference; a different price needs a reason, which goes into the item's history.

### Partners and transparency (batches 23 and 24)

- `/partners`: a public directory of partner shops that agreed to be listed, with kilograms in bands.
- "Your partnership" on a shop owner's account; an A5 "ReLoop Partner" window badge.
- `/ledger` (every handover to VRRG Group), `/reports` with a page, PDF and CSV per month, `/data` open CSVs with a data dictionary, and "Lately in the loop" on the home page.

### Standards (batch 25)

- `/standards` with grading, data-wipe (with a live count), rate-card and ownership standards; `/compliance` (the E-Waste Rules 2022 in plain words, VRRG Group); `/about`; `/faq`; `/accessibility`; `/how-we-price` expanded.

### Quality (batch 26)

- New release gates in the browser tests: no broken internal links, a title and description on every public page, no horizontal scrolling at 360, 768, 1024 and 1280 px, and no buy price or supplier field in the shop's HTML or page data.
- The unused `/resend-confirmation` page removed. No vulnerabilities in the shipped dependencies.

### Database

Migrations `20261106000001` to `20261107000007`, each with in-memory tests. Live checks 20 to 38 in `supabase-fixes/live-checks-v2.sql` and `live-checks-v3.sql`.

## Before v1.0.0

- **Batches 00 to 15 (October 2026):** quality baseline, security fixes, the simulation environment and demo, the design system and navigation, settings, roles and the hub overview, accounts and requests, offers, pickups and payouts, listing controls, warranty claims, ReLoop Checked inspections, item passports, public pricing, shop discovery and saved items. See `docs/progress.md`.
- **Rounds 1 to 4 (September and October 2026):** the public site, accounts and shop verification, the staff hub on Supabase, the loop from shop submissions to hub items, the partner map, the team page, retention, outreach printables and the guides.

# ReLoop v1.0.0: handoff to the cloud session

Written 2026-10-15 when local usage ran out. The cloud session sees only GitHub, so everything it needs is in this file, `docs/business-plan-v2-summary.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/engineering-standards.md` and `docs/adr/`. Read them first.

**Business Plan v2 is the source of truth.** The full plan is private and is not in this repo (it is gitignored: the repo is public and the plan holds the P&L). `docs/business-plan-v2-summary.md` is the public-safe summary. Never commit the plan, costs, margins, VRRG resale prices or any figure from its money section. Do not rewrite git history.

---

## 1. Where things stand

- `main` is at `3e1d6b6` (batch 15, PR #56, merged and live). Batches 00 to 15 are done and are recorded in `docs/progress.md`.
- Branch **`feat/business-plan-v2`** holds the work-in-progress of batch 15b (this handoff included). It is **not merged**.
- Production and simulation databases are both at migration `20261105000001_watchlist.sql`. Live checks: 13 + 30 + 19, all true.

### Batch 15b: done on the branch (groundwork only)

- v2 added locally as `docs/ReLoop_Business_Plan_v2.html` and **gitignored**; the old plan (`docs/ReLoop_Business_Plan.html`) removed from the tree (still in history; no rewrite).
- References to the old plan updated (`.prettierignore`, `docs/business-plan-alignment.md`, `frontend/src/app/globals.css`); the design palette and fonts are unchanged in v2.
- `docs/progress.md` top section cleaned up; row 15 marked done; row 15b added.
- Simulation journey tests fixed and green on the demo (`frontend/tests/sim/simulation.spec.ts`: unique question text per run, the item address awaited, the request card matched by its own status link).
- This handoff and the public summary written.

### Batch 15b: NOT started (no code, no migrations, no seed changes)

All twelve scope points in section 3 remain to do. A design pass (maps of the database, hub, public site and seed/docs, and a data spec for the migrations) was produced locally but contains plan financial figures, so it is **not** in the repo; it is kept privately by the user (see section 8). The cloud session should re-derive its own map from the code; the migration plan in section 3 is enough to start.

### Live changes already applied (all before this handoff)

- **Production database:** migration `20261105000001_watchlist.sql` (saved items), applied twice (before and after review fixes), each after a backup in `~/ReLoop-backups`. No test data left.
- **Simulation database (`reloop-sim`):** the same migration and a re-seed.
- **Vercel:** the real simulation secret key was set as `SUPABASE_SERVICE_ROLE_KEY` on `re-loop-demo` (Preview and Production) and `re-loop` Preview, and the demo was redeployed. Admin routes and request saving work on the demo; simulation journeys 37 of 37 pass on it.
- **Nothing live has been changed for 15b.** No 15b migration exists yet.

---

## 2. Execution rules (verbatim intent, all still apply)

- One branch and one PR per batch. Merge only when both CI checks pass **by name**: "Lint, types, unit tests, build" and "Browser tests" (and the PR is MERGEABLE). Live check after each merge. If production breaks, roll back with the Vercel CLI and stop.
- At the start of every batch: check for open PRs, unpushed commits and half-finished work from an interruption, and finish or clean that up first.
- Update `docs/progress.md` after each batch so work can resume after a pause.
- No secrets or personal data in files. Never run e2e tests against production. Preview deployments and e2e use the simulation environment.
- Never push to `main` directly; branches and PRs only. Commit messages end with the attribution line given in the session; PR bodies end with "🤖 Generated with [Claude Code](https://claude.com/claude-code)". commitlint rejects sentence-case subjects (a subject starting "ReLoop" fails): start with a lower-case word.
- Always keep at least one admin. No email sending; password recovery is admin-only.
- Every DB change is a new file in `backend/supabase/migrations/` with a PGlite test in `backend/tests/`, and every new permission gets a check in `supabase-fixes/live-checks-v1.sql` (19 exist now; new ones are 20+).
- Run `npm run check` and `CI=true npm run test:e2e` from the repo root before calling a batch done.
- Review each batch (self-review, or a review workflow) before shipping, and fix confirmed findings.

### Standard batch loop

1. Start check: `git checkout main && git pull --ff-only`, `gh pr list --state open`, create the branch.
2. Migration + PGlite tests + live check.
3. **LOCAL ONLY:** apply to the simulation project, run the checks there, re-seed.
4. Frontend, unit tests, CI e2e, simulation journeys.
5. `npm run check`, `CI=true npm run test:e2e`.
6. **LOCAL ONLY:** back up production, apply the migration live in one transaction, run all read-only checks (13 + 30 + v1) and confirm all true.
7. Update `docs/progress.md`, commit, open the PR, wait for both checks, merge, wait for the deploy, live check.

Database patterns learned (do not relearn the hard way): views run as their owner, but function EXECUTE inside a view is checked against the caller; subqueries in RLS policies are subject to the caller's column grants and RLS; `ALTER TYPE ADD VALUE` values can't be used in the same transaction (use them only in function bodies or `::text` comparisons); CHECK constraints treat NULL as passing (wrap in `coalesce(..., false)`); plpgsql variables must not share column names (use a `v_` prefix); index expressions must be immutable (`nulls not distinct` for unique-with-null); PostgREST caps responses at 1,000 rows (`allPages()` in `frontend/src/lib/pages.ts`); an RPC without a JSON content type returns 404; SECURITY DEFINER functions use `set search_path = ''`; PGlite fixtures with forced statuses need `alter table … disable trigger user`; avoid `now()`-dependent assertions on the seed (its "today" is 2026-10-14).

---

## 3. Batch 15b `feat/business-plan-v2` (ultracode)

Aligns everything already built with v2. Scope as given by the user:

1. **Scope and copy.** Remove household selling paths, household drop-off and every mention of households as sellers (pages, map, impact sources, help in English and Hindi, staff and shop-owner guides, poster and flyer, FAQ, sitemap). Remove TVs, small appliances, printers and UPS units from What we accept, categories, intake and simulation data (keep existing listings safe). Remove all shipping outside Jammu.
2. **Places.** Hub about 300 sq ft in Gandhi Nagar, between Bahu Plaza and Gole Market. Tuesday = Gandhi Nagar cluster (Bahu Plaza, Gole Market); Friday = old city (Raghunath Bazaar, Residency Road). Next markets: Janipur, Trikuta Nagar, Talab Tillo. Update settings, the map, route planning and the locations page.
3. **Scrap by weight.** Rate card per kg (screens and displays Rs 170, batteries Rs 800, dead motherboards Rs 130, everything else Rs 5), editable in hub settings and shown publicly on a "Rate card" page. At pickup staff weigh the shop's scrap by category; working parts are pulled out and tested first; the shop is paid by UPI with a receipt (reuse payouts and receipts from batch 08). The hub keeps four scrap bins (screens, boards, other, D devices) plus the battery cabinet, with a running kg ledger. Handover to VRRG Group, Gangyal, when any bin reaches 100 kg or 14 days pass; batteries every week whatever the quantity. Each handover gets a weight receipt.
4. **Devices.** Dead handsets and trade-ins from retailers and exchange stores, and old PCs from institutions. A resell, B repair at a partner shop, C strip for parts, D scrap. Before any device is bought the seller confirms they own it or have it signed over (required tick box, recorded). Data wiped or storage destroyed before anything is stripped or sold, logged against the tag.
5. **Jammu Parts Exchange.** Tested parts (boards, screens, cameras, ports, healthy batteries, laptop RAM and SSDs) listed within 48 hours with a 7-day return. Verified shop owners can list parts they harvest; staff approve each listing; ReLoop records a 12% commission when one sells. Parts are shown separately from refurbished devices in the shop.
6. **Stock rules** (replace the old day-45 / day-75 rules everywhere: daily job, hub alerts, tests, docs): a part unsold for 30 days gets a 25% price cut, once only; a device unsold for 45 days moves from A/B to C (strip for parts). Keep the job idempotent.
7. **Warranty.** 30 days on A/B devices, 7-day return on parts.
8. **Sources and buyers.** Sources: repair shops, retailers and exchange stores, institutions (Rs 3,000 per lot for pickup, sorting and a handover record; dead e-waste goes straight to VRRG with the institution named on the receipt). Buyers: Jammu technicians, students and budget buyers, labs and makers, and VRRG.
9. **KPIs and targets** from v2's pilot plan (40 partner shops, about 500 kg a month, 100% of scrap to VRRG on receipt, Rs 1.5 lakh of parts a month, 0 kg to unregistered dealers) in the hub KPI dashboard, the impact counter and the monthly report.
10. **Simulation.** Re-seed from v2's month-by-month operational figures (shops 10, 18, 26, 32, 36, 40; scrap kg 92, 222, 352, 436, 474, 506; devices 15, 25, 35, 45, 55, 60), rate card, grade split A 15% / B 20% / C 45% / D 20%, parts sales, institution lots, banner unchanged. Do not put plan money figures in the repo; use clearly labelled simulated values in the seed. (Calibrating the seed's gross margin to the plan's monthly figures is a **local-only** step.)
11. **Business data stays private.** The rate card is public; VRRG resale prices, margins, COGS and the P&L are staff-only (never in files, public views or public settings).
12. **Docs and tests.** Update `docs/report/platform-section.md`, known limitations, `CLAUDE.md` and the claims test for v2. Write **ADR 0005** (see decision 1 and 33 below), mark ADR 0004 partly superseded.

Suggested order: (a) migrations + PGlite tests + live checks (blocks and constraints for removed values, hub address, route.markets and `next_route_day(p_market)`, rate card settings, weigh-ins, bins and per-bin handovers, payouts with exactly one source, institution lots, partners linked to shop accounts, Parts Exchange tables and private photo bucket, ownership confirmation, wipe-before-strip with a cutoff date, part returns in `warranty_claims`, new part types `camera` and `charging_port`, new stock rules and cron, buyer areas, KPI views); (b) seed rewrite and `sim.test.mjs`; (c) hub and account UI; (d) public site, copy, print, help guide EN and HI; (e) docs, claims test, e2e and simulation journeys.

Enum rule (decision 34): **never drop enum values**. Block new use with checks or triggers; old rows stay valid and display with their labels.

---

## 4. The 46 v2 questions and their final decisions

"Default" means the default was accepted. "OVERRIDE" means the user's own decision, which wins. **Naming: the dismantler is "VRRG Group, Gangyal" everywhere** (site, settings, seed, docs, guides, printables, tests; replace "VRG Groups" and "VRG"). The official CPCB list spells it "M/s. VRG Groups, Gangyal"; keep "VRRG Group" regardless, and mention the difference in the final report.

**Blocking**

1. **Shop-listed parts on a 12% commission vs purchase-only (ADR 0004, CLAUDE.md, terms).** Default: write ADR 0005 "Parts Exchange: staff-approved partner listings on commission". It partly supersedes 0004: devices stay purchase-only; consignment and the 8% self-listing rule are dropped. The shop lists from its account; the part comes in on the route and sits on the hub shelf; staff test, tag (RL-JMU id, inspection, wipe where needed) and approve; it shows as "Listed by a partner shop, tested by ReLoop" (`source_type` `partner_listing`, `buy_paise` 0, commission rate stored on the row). The buyer pays ReLoop offline. ReLoop handles the 7-day return and pays the shop 88% after day 7. Add a "Listing parts on the Jammu Parts Exchange" section to the terms (commission, seller of record, returns, payout timing). Update CLAUDE.md and the "recommended against" list. Leave the `consignments` table and `consignment` buy mode in place, documented as unused, and block new rows.
2. **Pay on the spot by weight vs working parts found only by testing.** Default: two steps. (1) At the counter: likely-working parts and whole devices go into a "to test" bag under the shop's name, logged on the weigh-in slip with no money yet; the rest is weighed by rate-card category and paid by UPI on the spot. The counter weight is the paid weight; hub re-weigh differences are logged, never charged back. (2) At the hub within 24 hours each working part is tagged and paid at the part price (or listed by the shop at 12%) on the next route visit as its own receipt line; failed parts go to their bin and are paid at the kg rate.
3. **Payouts, pickups and receipts only work for per-lot offers from verified accounts.** Default: add a `scrap_weighins` table (pickup, partner, kg per rate category, snapshot of the rates used, amount) and a weekly standing stop per active partner generated from `partners.route_day`. Payouts get an exactly-one-source check (`shop_submission_id`, weigh-in or exchange sale, each nullable and unique), linked to a `partners` row with the shop-owner account optional. Receipts get a private token link; staff share it from the hub phone via a prefilled `wa.me` message. A verified account stays optional (needed only to list parts or to send whole devices for an offer). Rewrite the help guide (EN and HI) around both paths.
4. **Institutions: dead e-waste "straight to VRRG" vs carried to the hub.** Default: sort on the premises on pickup day. ReLoop buys and carries only working and repairable equipment, tagged and paid on its own receipt. Dead e-waste goes from the institution to VRRG on VRRG's weight receipt naming the institution; ReLoop arranges it but never carries, stores, bins or pays for it. Record it as a handover with `on_behalf_of` = the institution, outside the four bins and the rate-card ledger; ReLoop earns only the Rs 3,000 fee. Count it in "kg to VRRG" as a separate "institution lot" line, not in "about 500 kg through the hub". Keep v2's kg and device counts in the simulation. Reword "at our hub, not on your premises".
5. **Phase 1: buying and storing scrap and batteries with no authorisation.** **OVERRIDE:** do not block anything; **no legal-review text on public pages.** Public copy must not claim that ReLoop is authorised, registered, approved or endorsed by JKPCC, JMC or any authority, and says nothing about regulators approving ReLoop. Use "part removal for reuse", never "dismantling", for ReLoop's own work. Internally `docs/known-limitations.md` keeps exactly one line: "Phase 2 registration (JKPCC consent, CPCB refurbisher) planned from month 6."
6. **Plan financials would leak (public repo, client bundle, demo admin login).** **OVERRIDE / default combined:** do NOT rewrite git history. Gitignore the v2 HTML (done), commit only the public-safe summary (done: `docs/business-plan-v2-summary.md`), remove the v1 plan from the current tree (done). VRRG prices, fixed and setup costs and benchmarks live only in staff-read `app_settings` keys (`vrg.%`, `finance.%`) and in the seed; add a live check that those keys are never public. `business-rules.ts` holds only public rules. On `/demo` list only the buyer and shop-owner logins; share the staff and admin demo logins privately.

**Important**

7. **VRRG named as the partner.** **OVERRIDE:** VRRG has committed to take our e-waste. Present it confidently: "Our dismantling partner: VRRG Group, Gangyal, a JKPCC-authorised e-waste dismantler. Every kilo of scrap and every battery goes to them on a weight receipt." No "agreement being finalised" wording and **no admin switch**. Name one partner, never "dismantlers" or "recyclers" in the plural. Show "100% of scrap to VRRG on a weight receipt" as ReLoop's standard (a statement of practice; any measured percentage appears only once receipts exist). Use "handed to", never "collects". Never call ReLoop a collector, recycler or dismantler.
8. **Institution pickup: free vs Rs 3,000 a lot.** Default: Rs 3,000 a lot (sorting on site, arranging the VRRG handover, the handover record), shown publicly on `/sell/institutions` and the booking confirmation; record it as income; fee and equipment payment are separate receipt lines, never netted; never use "free" for institutions.
9. **Printers and UPS units are excluded but institution lots include them.** Default: not bought, carried or recorded; listed under "we don't take"; staff point the institution to VRRG directly; the fee does not change; keep v2's kg in the simulation with a note; drop printer and UPS strip outputs from the seed; keep the `motor` part type only for phone and laptop motors.
10. **Public rate card vs "buy prices never public".** Default: the per-kg rate card and the 12% commission (shown to shops, never to buyers) are published terms, stored as allow-listed `rate_card.*` public settings with a snapshot on every weigh-in. Per-device buy prices, grade buy/sale tables, VRRG rates, margins and COGS stay staff-only. Remove the 45% / 25% / Rs 100-200 / "free disposal" rows from `/sell`. Public copy: "scrap is paid at the rate card; each device gets an offer after testing that you can decline". A live check proves no other price keys are public. The leak scan exempts the four rate values on `/rate-card` and the shop sell pages only.
11. **Rate card claims.** **OVERRIDE:** attractive but realistic, using only figures from the plan and its field interviews, labelled with source and date. Allowed lines: "Paid by UPI on the spot, weighed in front of you"; "We take the junk dealers don't: Rs 5 a kg"; "Working parts paid as parts, not by the kilo (a working board can fetch about Rs 2,500 as a part, against Rs 20-30 as scrap)"; "A fixed weekly pickup day"; "Our rates are level with the dealer rates we recorded in Jammu's markets (field interviews, October 2026)". A dealer-rate column is allowed only with that source line. Never "beats", "best price" or guaranteed earnings; add claims-test bans for those (and for "matches or beats", "beats the dealer", "dealers pay"). Printed rate cards show the date and a QR code to the live page.
12. **Rate-card categories.** Default: screens = loose phone, tablet and laptop display assemblies only (whole monitors and laptops are devices with an offer after testing; TV panels refused). Batteries = lithium phone, laptop and tablet cells only; lead-acid not accepted; swollen (not leaking) lithium cells go in a fire-safe bag to the sand cabinet; leaking cells refused. "Everything else" = phone and laptop repair leftovers; the four excluded categories are refused even at Rs 5/kg. Rewrite `accept.take` and `accept.dont` without the hub drop-off clause.
13. **No buy price for loose working parts.** Default: a staff-only part price list in hub settings (`reference_prices`), shown to the shop on its own receipt, never publicly. Public: "Working parts: priced one by one after testing; you can decline, or list them yourself on the Parts Exchange".
14. **Route days.** Default: `route.markets` setting `{market: {day, starts_on}}`; `next_route_day()` takes the shop's market; unknown or not-yet-started markets show "next route day to be confirmed" and are flagged to staff. Public: "Tuesday: Gandhi Nagar cluster, from November 2026; Friday: old city, from January 2027"; the top bar says "weekly pickups". Retailers get a monthly or on-request stop on their cluster's day. The institution booking form stays open with dates from January 2027.
15. **Production settings still hold the old hub address.** Default: a migration updates `hub.address` only where it still equals the old seeded text: "Gandhi Nagar, between Bahu Plaza and Gole Market. Exact address when we open." Map area moves there, labelled approximate. Opening stays November 2026. Update the e2e assertion and known limitations.
16. **Printed flyers, poster and drop-off feature assume households.** Default: `/go/drive` still lands on `/locations`, with one line there and on `/what-we-accept`: "We buy from shops, retailers and institutions only, not from homes. Anyone can buy from us." Remove `dropoff.shops` (setting, section, test) by migration. `/locations` lists consenting shops as "Partner shops on our route"; contact card says "Hub (buyer pickups)". Retire the partner poster for a shopkeeper counter card (weekly day, rate card, WhatsApp). The window badge becomes "Tested parts from ReLoop". Regenerate the flyer as a buyer and campus flyer. Drop the Households menu entry.
17. **Shipping removal.** Default: keep the `ship_india` enum value for history, block it for new sales with a constraint, remove it from the reservation form, the hub sale form, compare and the shop page, remove shipping from the seed and snapshot, drop "Outside Jammu (shipped)" from buyer areas and add "Collected at the hub (area not recorded)", correct CLAUDE.md, flip the `shop.spec` assertion and add claims-test bans (`ship(s|ping|ped)? (across|outside) (india|jammu)`, `nationally`).
18. **Grade meanings.** Default: grades A to D apply to devices only; parts show a "Tested part" label and test result (the DB grade column stays); D reads "Not resold for use; handed to VRRG by weight"; the home page says "grade A or B, or a tested part".
19. **7-day parts return.** Default: within 7 days of sale a part can be returned if faulty, doesn't work when fitted or doesn't fit the stated model, provided it is undamaged (no burns, tag sticker intact); refund or swap after a staff check; still no change-of-mind returns. Extend `warranty_claims` to parts with a 7-day window and a `part_return` kind. ReLoop handles every return, including on shop-listed parts, and pays the shop's share only after day 7. Update the warranty page, the e2e test and the standards page.
20. **Stock-rule details.** Default: both rules count from `listed_at`; ReLoop-owned parts get one 25% cut at day 30 when `price_cut_at` is null (rounded to Rs 10, floor Rs 10; an earlier cut counts as the "once"; a manual change does not set it). Shop-listed parts get a day-30 reminder to the shop instead of a cut. Unsold parts at day 60 raise a "consider scrap" hub alert. Devices: no automatic cut; at day 45 a listed A/B device becomes C and stripping, reserved items skipped; watchers get a "no longer for sale" notice. Keep existing price history. Items already past a threshold at switch-over get 7 days' grace (check the live count first). The 48-hour listing alert covers parts and A/B devices. Update How we price, the FAQ, metadata and the staff guide.
21. **Pilot KPIs.** **OVERRIDE:** follow the plan; **Rs 1.5 lakh means tested parts sold a month, Parts Exchange included; staff-only.** Replace the old targets in `business-rules.ts` with v2's five, plus the stage gates (200 kg in a month with at most 4 missed weekly pickups, then profitable two months running) on `/hub/kpis`. Public counter and `/reports` show counts and kg only: partner shops, kg through the hub, kg handed to VRRG on receipts, kg awaiting handover, devices resold, parts sold as a count; "100%" shown as the standard. "0 kg to unregistered dealers" is a staff-only KPI from a monthly shop self-report. Reuse share and days in stock are measured with no target. A C device counts as reused only once one of its parts is listed or sold.
22. **Claims test.** Default: add bans for `/profitab/i`, `/set-?up cost/i`, `/gross margin/i`, `/\bCOGS\b/`, `/P&L/`, `/fixed costs/i`, `/\blakh\b/i`, `/is legal/i`, `/unregistered (van|dealer)/i`, plus the "beats", "best price", "guaranteed" bans from 11. Public copy says "wiped, or its storage destroyed, and logged against its tag" and "informal dealers". Run the scan over every public route from the nav config and sitemap, not a hand-kept list. Hub pages are excluded. Do not write the plan's setup, fixed-cost or per-kg margin amounts into the test (the repo is public); a local session adds numeric bans from the private plan.
23. **Data wipe vs selling phone boards.** Default: `wipe_required` also covers part type `board` from phones, laptops and desktops, inherited from the parent device. Every board or storage-bearing part pulled from kg scrap for resale is tagged before testing. A board is listed only after a logged reset and overwrite; if it can't be wiped its storage chip is destroyed and it goes to the boards bin. Add a "wiped before stripping/stripped" check with a cutoff date so older rows are exempt. The weigh-in receipt carries a lot-level declaration that the shop may sell the swapped parts. Privacy page, Rate card page and Data-wipe standard say parts are covered.
24. **Ownership rule.** Default: drop "unclaimed customer devices" unless signed over in writing. Locked devices only as C/D with the ownership tick, never resold whole; reported-lost or blacklisted devices refused. Record per lot: seller, timestamp, declaration text version, tags covered and the staff member present, no original-owner details. Kept with the purchase record (anonymised on deletion). Add `ownership_confirmed_at/by`, required after a cutoff, through intake, `convert_submission` and weigh-ins. One line each on the privacy page and terms.
25. **Naming the shop on a part listing.** Default: a shop agrees to be named before it can list. A listed part shows "Listed by <shop name>, <market>" from a public column on a dedicated parts-listing view, never `items.source_name`. The leak scan allow-lists consenting listing shops only. The commission is never shown to buyers. ReLoop is the buyer's contact and seller of record for returns.
26. **What a "partner shop" is.** Default: `partners.shop_owner_id` (nullable, unique). For the KPI and public counter a partner shop is an active `partners` row with a route day; repair shops counted, retailers and exchange stores shown separately. Exchange listing needs a verified shop owner linked to an active partner. Exchange stores use type `retailer` with a label (enum unchanged).
27. **Whole-device offer flow stays.** Default: keep `/sell/shops` and the offer flow for whole devices from any partner, with the weigh-in pickup alongside it. In the simulation, run most retailer handsets through the offer flow; repair shops get scrap lots only.
28. **Simulated months.** Default: keep the six months ending today, banner unchanged, every report and KPI labelled "Simulated month N", with v2's phasing by month number (Tuesday only in months 1-2; Friday route, retailers and 3 institutions from month 3; 40 shops by month 6).
29. **Where kg figures come from.** Default: public and partner kg come only from weighed records (weigh-ins, item `weight_kg`, handover receipts). An estimate is used only for a tagged device with no measured weight, labelled (phone 0.2, laptop 2.2, desktop 8, monitor 4.5, accessory 0.3, part 0.2 kg); drop estimates for excluded categories. New handover keys: screens, boards, other, d_devices, plus battery_kg; old rows shown unchanged as "before bins". Replace "kept out of landfill" with "handed to our dismantling partner".
30. **Per-shop and per-market kg.** Default: the directory shows name, market, type, "partner since" and kg in bands only ("under 25 kg", "25-100 kg", "100+ kg"), no category split, no rupees, under its own consent toggle. Network and impact flows merge any market with fewer than 3 active shops into "Other Jammu markets"; live check on both views. Exact kg only on the shop's own dashboard. No per-shop kg to any authority until partner terms and the privacy page cover it. The privacy page states the ledger is kept as an e-waste record and anonymised on account deletion.
31. **Institution handover record and public ledger.** Default: call it "Handover record" (no "certificate" or "disposal"): what ReLoop bought (by tag) and what went to VRRG (kg by category, VRRG's receipt number in the institution's name). Public ledger rows show "Institution lot" with no name; receipt references appear only for ReLoop's own handovers; an institution can opt in to being named (admin toggle, consent date). Never publish receipt scans.
32. **WhatsApp receipts and price-cut broadcasts.** Default: receipts: staff tap "Share on WhatsApp" (`wa.me` with the receipt link) from the hub phone; the receipt is always in the shop's account; the simulation marks it "not sent". Price cuts: shown on the Parts Exchange page, as on-site notifications to watchers, and on a weekly hub "price cuts" list with a `wa.me` share button. No WhatsApp API in v1; record it in known limitations.
33. **ADR 0004 assumes every intake is a tagged item.** Default: ADR 0005 also records two stock types: tagged items (devices and parts) and untagged scrap lots in a kg ledger, with four bins plus a battery cabinet replacing the scrap cage. Sources: repair shops, retailers and exchange stores, institutions. Mark 0004 "partly superseded"; remove the consignment and "Grade D free pickup" rows from `business-rules.md`. Scrap bags get a bin and kg label, not an RL-JMU tag.
34. **Removing enum values.** Default: keep every enum value; add a check or trigger so new items, reference prices, conversions and requests can't use them; old rows stay valid. The API rejects new household requests; old ones stay in the hub with a "we no longer collect from households: reply and close" note and expire under the 12-month retention rule. Hide the values from intake, checklists, the submission form, settings weights and shop filters, except where a listed item still uses one. Rename "Other electronics" to "Other phone or laptop parts". Replace the CI sample printer with a monitor or desktop. **LOCAL ONLY:** run a read-only query for live rows in these values before changing anything.
35. **Naming institutions; About page.** **OVERRIDE:** About says: "ReLoop is a circular-economy venture started by students of IIM Jammu as part of a supply chain management project, building Jammu's local loop for e-waste." Add a "Help us build it" section inviting repair shops, retailers, institutions, technicians and volunteers to partner, with WhatsApp and email contact. Name no other institution anywhere. Public pages and print use "colleges, schools, banks and offices" and "students in Jammu"; an institution is named as a source or partner only after it agrees in writing (admin consent toggle). Drop SBM-U from the public site; keep only the E-Waste (Management) Rules 2022 explanation with the CPCB link, and say nothing about regulators approving ReLoop.

**Minor**

36. **Delivery zone.** **OVERRIDE:** Rs 50 delivery in Jammu city, otherwise pickup from the hub; nothing shipped outside Jammu. "Jammu city" = the Jammu Municipal Corporation area. The buyer-area list is that zone's localities (about 12) plus "Collected at the hub". Say "Jammu city" on the site.
37. **Rack capacity.** Default: replace the old 300-item figure with `capacity.device_rack_slots`, left unset in production (no percentage or alert until the hub lead counts the slots), with a labelled simulated value in the simulation. Each bin: 100 kg (handover trigger), alert at 80 kg. Battery cabinet: weekly, no kg limit. Parts shelf: count only. Age bands: 0-30, 31-45, 45+ for devices; 0-30, 30+ for parts.
38. **Handover records.** Default: staff-only per-category VRRG rates as jsonb on handovers. Alert per bin (100 kg, or 14 days since that bin's oldest entry). Weekly battery reminder whenever the cabinet holds any kg. Batch 21 extends the 15b battery ledger (count, condition, reused flag) instead of a second table.
39. **Handling and margin target.** **OVERRIDE:** use only the plan's benchmarks; **remove the 40% target.** Handling defaults to Rs 0 (editable); the B repair cost is the actual `repair_jobs` fee. Staff pricing flags and dashboards use the plan's unit figures (the per-kg scrap spread, the per-device figure, and 12% commission on shop-listed parts) held in staff-only settings; commission is not margin-tested. The actual unit values are **LOCAL ONLY** (see section 7): build the settings keys and use simulated placeholder values in the repo.
40. **Impact page framing.** **OVERRIDE (with all benchmarks):** use only what the plan benchmarks. Default framing: Jammu-only ("Jammu's e-waste, kept in Jammu"); replace the story with an illustrative repair-shop one (a dead board is tested, a part goes to a technician, the rest to VRRG), kept labelled "illustrative"; drop "homes" and "kitchen drawer"; no national expansion talk.
41. **"Sell" calls to action.** Default: rename the button and menu "For shops & institutions"; home section "Run a repair shop, store or office?"; accept-page headline "What shops and institutions can sell us"; WhatsApp prefill asks for the shop or institution name.
42. **Cash or UPI.** Default: public copy and the help guide say "paid by UPI on the spot"; the hub still allows cash as a recorded exception; receipts show the method.
43. **Labs and makers.** Default: only tested-working parts go to labs and makers, tagged and logged as Parts Exchange sales; anything dead goes only to VRRG. Say so on the Rate card and standards pages.
44. **Interview figures and quotes.** Default: no verbatim quotes or identifying figures on the public site unless written consent is on file. At most a few rounded aggregate figures labelled "What 13 Jammu shops, retailers and vendors told us in interviews (2026), not ReLoop data", on `/impact` or About only, never in hero stats. (The Rs 2,500 versus Rs 20-30 board figure and the dealer-rate line in decision 11 are allowed with their source line.)
45. **CCTV.** Default: a privacy section: entrance footage only, for security, kept up to 30 days then overwritten, viewed by the hub lead, shared only with police on request; a notice sign at the shutter; no mention elsewhere on the site.
46. **Shop-owner part photos.** Default: shop owners upload to a private bucket (5 MB max; JPEG, PNG or WebP); the server strips EXIF; photos are copied to the public item-photo path only when staff approve the listing. Live check that the private bucket isn't anon-readable.

---

## 5. Effort map

Before each batch, check the effort setting. The user changes it themselves; if it differs, stop and say exactly: "Run /effort <setting>, then type continue."

- **ultracode:** 15b, 17, 18, 19, 26
- **xhigh:** 15, 16, 20, 21, 22, 23, 24, 25, 27

With ultracode, use parallel workflows only for auditing, building, testing and reviewing code. Do every live database write, every merge to `main` and every production check one at a time in the main session. (In a cloud session there is no live access at all: see section 7.)

---

## 6. Remaining batches 16 to 27 (build to v2)

Build all of them to v2 and the 46 decisions above. Risk and time estimates are the original ones.

**16 `feat/impact-network` (xhigh; med risk, aggregates must not identify anyone)**

- Public aggregate views `impact_flows` (source group to outcome, count and kg, by month) and `network_flows` (source market to hub, hub to buyer area suppressed below 3, hub to VRRG in kg), by **kg per scrap category plus devices and parts**. Markets with fewer than 3 active shops merge into "Other Jammu markets" (decision 30). Kg only from weighed records (decision 29).
- Buyer's area at sale, picked by staff from the JMC-area locality list plus "Collected at the hub".
- `/impact` rebuilt: server-rendered SVG Sankey; totals over time; v2 KPIs as targets/standards; Jammu-only framing (decision 40); kg to VRRG. New `/network`: Leaflet with flow lines sized by volume, loaded only when scrolled into view. Home gets a static SVG preview. No CO2 unless a published factor and source are supplied (decision from the original plan).

**17 `feat/redesign-core` (ultracode; med)**

- Home: hero and how it works, live impact numbers and activity-feed slot, a trust strip (Bought, Tested, Wiped, Graded, Listed), network preview. Shop and item pages: gallery, specs, grade badge on devices and "Tested part" on parts, inspection, price band, passport, similar items. Account and auth pages. Branded 404, `error.tsx` that keeps the header and footer, `global-error.tsx`, `loading.tsx` skeletons.

**18 `feat/redesign-pages-and-wording` (ultracode; med, claims)**

- Redesign sell (For shops & institutions), what we accept, locations, help (EN/HI toggle kept), contact, print, privacy, terms. Wording pass across every page to present a live platform running the Jammu pilot: the hub opening date appears only on `/locations` and `/contact`; honest, positive empty states; samples stay labelled; privacy and terms stay marked as drafts. Printables regenerated. The claims test extended to every new page, using the bans in decisions 11, 17 and 22.

**19 `feat/hub-redesign` (ultracode; med)**

- Consistent hub shell and navigation; dense readable tables; keyboard-friendly forms; clear status colours; daily dashboards.

**20 `feat/route-and-repairs` (xhigh; med)**

- `/hub/route`: per Tuesday and Friday, stops in route order by cluster (Tuesday: Gandhi Nagar cluster; Friday: old city), from standing weekly partner stops and booked institution lots, with expected items; printable run sheet; mark collected or missed (missed stops roll to the next route day for that market); the weigh-in form per stop.
- `/hub/repairs`: board with partner, fault, agreed fee, date out and days out; record returned or failed (`repair_jobs.returned_at`, `outcome`); the fee goes into COGS (staff-only).

**21 `feat/capacity-batteries-records` (xhigh; med)**

- Capacity: kg per bin against 100 kg (alert at 80 kg), device rack slots (setting, unset in production), parts shelf count, age bands (decision 37). Battery ledger (count, kg, condition, reused flag) with weekly handover and a hub reminder (extends the 15b ledger; decision 38). "Handover record" PDF per institution handover (decision 31), no "certificate" or "disposal".

**22 `feat/staff-pricing` (xhigh; HIGH risk: margins must stay staff-only)**

- Bands per grade with the formula shown; `/hub/pricing` dashboard by category and grade (buy vs sale over time, COGS = buy + repair + handling, days to sell, sell-through). Flags and benchmarks use **only the plan's unit figures** (per-kg scrap spread, per-device figure, 12% commission on shop-listed parts) from staff-only settings; **no 40% target** (decision 39). Suggested list price at intake with a logged override reason. CSV without supplier contacts. View `item_margins` with `security_invoker`, staff only, anon revoked explicitly.

**23 `feat/partners` (xhigh; med)**

- Shop-owner dashboard: submitted, offers, accepted, picked up, paid out, weigh-ins, Parts Exchange listings and sales, estimated kg labelled "estimated". Printable "ReLoop Partner" window badge reading "Tested parts from ReLoop" (A5 PDF, QR to `/locations`) and the shopkeeper counter card. Public partner directory `/partners` (view `partner_directory`): consenting shops only, kg in bands (decision 30). Partners include retailers and exchange stores.

**24 `feat/transparency` (xhigh; med)**

- `/ledger`: every VRRG handover (date, categories, kg, receipt reference for ReLoop's own handovers; "Institution lot" rows unnamed), CSV. `/reports` archive and `/reports/[yyyy-mm]` monthly pages with PDF and CSV (labelled "Simulated month N" in the simulation). `/data` open-data CSVs and data dictionary. Live activity feed (view `activity_feed`): at least 24 h old, date only, category plus market for partners, retailers and institutions; shown only with 5 or more events in 30 days. All hide themselves or show "pilot starting" when data is thin.

**25 `feat/standards-pages` (xhigh; low, claims)**

- Grading standard; Data-wipe standard (with a live count of devices wiped; boards covered); How we price (expand `/how-we-price` with the new stock rules); Rate card standard; Warranty and returns (30-day devices, 7-day parts return); the Ownership rule; Compliance and partners (E-Waste Rules 2022 in plain words with the CPCB link; VRRG as our dismantling partner per decision 7; nothing claiming authorisation, registration or approval for ReLoop; nothing about regulators approving ReLoop); About (decision 35, with "Help us build it"); FAQ; Accessibility statement. Bidding written up in `known-limitations.md` (not built: it conflicts with fixed prices and the stock rules).

**26 `chore/quality-gates` (ultracode; med)**

- Run every gate in section 8 and fix what fails. Clean up dead code (`/resend-confirmation`, `qr_scans`, unused exports, `DeviceCopy` if empty). Delete merged remote and local branches including `claude-wip` (local-only deletion of remote branches may need the user). Screenshots into `docs/report/screenshots/`. Update `CLAUDE.md`, `docs/architecture.md`, `docs/known-limitations.md`.

**27 `release/v1.0.0` (xhigh; low)**

- `CHANGELOG.md` covering the whole project; update `platform-section.md`, the staff guide and the shop-owner guide (`npm run help-guide -w frontend`); tag `v1.0.0` and a GitHub release with plain-language notes; `CLAUDE.md` feature-freeze section; close `progress.md`; the final report (below).

### Product rules (binding for every batch)

- StockX and similar sites are inspiration for ideas only: no copied layouts, logos, tag designs or phrases such as "Verified Authentic".
- No invented data on production. Every number or chart comes from live data or staff-entered reference values labelled "estimated" with source and date, and hides itself or shows a clear "pilot starting" state when data is too thin. No fake testimonials, reviews or partner logos. Any environmental figure must use cited, published factors, or be left out (CO2 is left out).
- Visitors and buyers never see buy prices, COGS, margins, supplier details, payment methods or internal notes. Public maps and feeds show areas and categories, never individuals or addresses of private people. Extend the live read-only checks to prove it. (The per-kg rate card and the 12% commission shown to shops are published terms.)
- No claims the business plan doesn't support. ReLoop holds no authorisation in Phase 1; public copy never says ReLoop is authorised, registered, approved or endorsed by any authority. Never "beats", "best price", guaranteed earnings, "certified" or "certificate".
- Campaign tracking uses ReLoop's own short-link counters (`/go/...`); the printed QR codes point at `https://re-loop-ochre.vercel.app/go/drive`, and that domain must stay on the Vercel project.
- Nothing is sold or shipped outside Jammu. No households as sellers. No TVs, small appliances, printers or UPS units.

---

## 7. LOCAL-ONLY steps (a cloud session cannot do these; the user or a local session must)

Everything below needs Keychain secrets, the live or simulation database, or the Vercel login. The cloud session writes the code, tests and migration files and opens PRs; a local session does these.

1. **Keychain entries:** `reloop-live-db` (production connection string; the user adds it when asked; never printed or saved to a file), `reloop-supabase-token` (Supabase access token, for the simulation project `fskpgbbsvcwhqogjkezj`), `reloop-sim-db-password`, `reloop-sim-service` (real simulation secret key). **Delete `reloop-live-db`, `reloop-supabase-token` and `reloop-sim-db-password` at the very end, even if something fails.** Never print any secret.
2. **Back up production** to `~/ReLoop-backups` before the first write of each batch.
3. **Apply every new migration** to the simulation project, run the checks there, and re-seed (`SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s reloop-supabase-token -w) node backend/sim/seed.mjs --apply`), then apply it to production in one transaction **before merging the code that uses it**, and run the read-only checks (`supabase-fixes/2026-10-14-checks.sql`, `live-checks-extra.sql`, `live-checks-v1.sql`): all must be true.
4. **Read-only production queries** before 15b's migrations: count live rows using the excluded categories, `household` sources, `household_dropoff` and `consignment` requests, `ship_india` fulfilment and the `hub.address` and `dropoff.shops` settings (decisions 15, 16, 17, 34), and the number of items already past the new stock-rule thresholds (decision 20).
5. **Simulation journeys** against a local simulation build (needs the simulation keys; `NEXT_PUBLIC_RELOOP_ENV=simulation`, site URL `http://localhost:3200`) and against the demo `https://re-loop-demo-beige.vercel.app`; Lighthouse and screenshots on production and the demo.
6. **Staff-only benchmark values:** enter the plan's unit figures (per-kg scrap spread, per-device figure, the pilot gross-margin calibration for the seed) into staff-only `app_settings` locally; do not put them in files. The seed uses clearly labelled simulated values; calibrating it to the plan's monthly gross margin needs the private plan.
7. **Vercel:** deployments, rollbacks (`vercel rollback`), env changes, redeploying `re-loop-demo`. Merging to `main` deploys to production; check the live pages after each merge.
8. **GitHub admin actions** (unpublish GitHub Pages, branch deletion on the remote) if the token lacks rights.
9. **Regenerate printables** (`npm run print -w frontend`) is code-only, but verify the PDFs visually locally.
10. **Final backup, then delete the Keychain entries** (item 1), then the final report.

### 7a. Added by the cloud run (batch 15b), in run order

Every money value below is **absent from the repository**. The code reads it from a staff-only setting or a gitignored local file, and works (with the value empty) until it is filled in.

1. **Back up production** (`scripts/backup-live-data.sh`), then run the read-only queries of item 4 above.
2. **Apply migrations `20261106000001` to `20261106000006`** to the simulation project first, then production (one transaction each, in order). Then run `supabase-fixes/live-checks-v2.sql` (checks 20 to 30) with the existing sets: 13 + 30 + 19 + 11 must all be true.
3. **Fill in `backend/sim/local-inputs.json`** (copy from `local-inputs.example.json`; gitignored): `buy_share_of_resale`, `c_device_buy_rupees`, `tested_part_buy_rupees` and `vrrg_rates_paise` (VRRG Group's per-kg rates per bin). Re-seed the simulation: `SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s reloop-supabase-token -w) node backend/sim/seed.mjs --apply`.
4. **Staff-only money settings** (set through `/hub/settings` as admin, or `set_setting()`; never in a file): `finance.scrap_spread_paise_per_kg`, `finance.device_unit_paise`, `finance.parts_target_monthly_paise`, `finance.fixed_costs_monthly_paise`, `finance.setup_costs_paise` and `vrg.rates_paise`. The pilot KPIs show "not set" until they exist.
5. **Launch-date settings** (empty by default, so nothing is enforced early): `ownership.required_from`, `wipe.strip_required_from`, `stock.grace_until`, and `capacity.device_rack_slots`.
6. **Vercel environment:** no new variables for 15b. Confirm `vercel.json` still pins `bom1`. The `reloop-stock-rules` cron job is unchanged (the new stock rules run inside it).
7. **Printables:** open `frontend/public/print/counter-card.pdf` and `awareness-flyer.pdf` and check them visually; the rate-card QR points at `/go/rate-card`.

### 7b. Added by batch 16 (impact and network), in run order

1. Apply migration `20261107000001_impact_network.sql` to the simulation project, then production (after a backup), and re-seed the simulation (the seed now sets a buyer area on sold items). Then run `supabase-fixes/live-checks-v3.sql` (checks 31 and 32 must be true) with the earlier sets.
2. Staff review the `buyer_areas` list (it is a starting set of Jammu localities; admins can add or rename rows) before the first sale is recorded with an area.
3. Look at `/impact` and `/network` on the simulation build: the Sankeys, the monthly bars and the Leaflet map need the data to be present.

### 7c. Added by batch 20 (route and repairs), in run order

1. Apply migration `20261107000002_route_and_repairs.sql` to the simulation project, then production (after a backup). Run `supabase-fixes/live-checks-v3.sql` (check 33 must be true).
2. Check `route.markets` in the simulation and production settings: the run sheet only lists a partner shop from its market's start date. Spot-check the Tuesday and Friday sheets against the real partner list.

### 7d. Added by batch 21 (capacity, batteries, records), in run order

1. Apply migration `20261107000003_capacity_batteries_records.sql` to the simulation project, then production (after a backup), and re-seed the simulation. Run `supabase-fixes/live-checks-v3.sql` (check 34 must be true).
2. The hub lead counts the device rack slots and sets `capacity.device_rack_slots` in `/hub/settings` (it stays unset in production until then, so no percentage or alert shows). The simulation uses a labelled simulated value.
3. Open one institution lot's "Handover record (PDF)" on the simulation and read it through: it must list tags and the VRRG receipt, with no prices and no "certificate" or "disposal" wording.

### 7e. Added by batch 22 (staff pricing), in run order

1. Apply migration `20261107000004_staff_pricing.sql` to the simulation project, then production (after a backup). Run `supabase-fixes/live-checks-v3.sql` (check 35 must be true).
2. **LOCAL ONLY values:** in `backend/sim/local-inputs.json` set `finance_benchmarks_paise` (`finance.device_unit_paise`, `finance.scrap_spread_paise_per_kg`) from the plan if the simulation should be calibrated (the committed example has deliberately odd simulated numbers), then re-seed. In production an admin enters the same two keys and `vrg.rates_paise` in `/hub/settings`; never in a file.
3. Sign in as staff on the simulation and open `/hub/pricing`: check the flags make sense, then download the CSV and confirm it has no supplier names or phone numbers.

### 7f. Added by batch 23 (partners), in run order

1. Apply migration `20261107000005_partners.sql` to the simulation project, then production (after a backup). Run `supabase-fixes/live-checks-v3.sql` (check 36 must be true).
2. Before switching a shop into the public directory (`/hub/partners`, admin), get the shop's agreement; the consent date is recorded when the box is ticked. The partner terms and the privacy page should mention the directory before the first shop is listed.
3. Print `frontend/public/print/partner-badge.pdf` (A5) once and check the QR code opens `/go/partner-badge` and lands on `/locations`.

### 7g. Added by batch 24 (transparency), in run order

1. Apply migration `20261107000006_transparency.sql` to the simulation project, then production (after a backup). Run `supabase-fixes/live-checks-v3.sql` (check 37 must be true).
2. Before naming any institution on `/ledger`, record its agreement (`institutions.named_publicly` and `named_consent_at`); by default lots stay "Institution lot".
3. On the simulation build, open `/reports`, one month, its PDF and CSV, `/ledger`, `/data` and the home page's "Lately in the loop" feed.

### Open items for the final report

GitHub Pages unpublish (needs repo admin rights); the empty Supabase organisation; the simulation project is in Singapore; the CPCB list spells the dismantler "VRG Groups" while ReLoop uses "VRRG Group" (per the user); the Hindi on `/help` needs a native speaker's check; Phase 2 registration is planned from month 6 (one line in `known-limitations.md`).

---

## 8. Quality gates (release)

| Gate                | How it is checked                                                                                                                                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journeys            | Playwright journeys per role (visitor, buyer, shop owner, staff, admin) covering every feature: CI with no database, CI against the simulation, and the demo. On production only temporary accounts check key flows, then everything is deleted with a count check.                                       |
| Tests               | `npm run check`; backend PGlite tests for every new table and view across anon, buyer, owner, staff and admin; all browser tests green; every new feature has a browser test.                                                                                                                             |
| Lighthouse (mobile) | Home, shop, item, sell, locations, impact, network, help and hub. Accessibility and best practices 100; public pages performance at least 90 and SEO at least 95. Local production build plus production and demo; the hub signed in. Before/after table (baseline in `docs/report/quality-baseline.md`). |
| Console             | Sweep every page as each role on the simulation build: zero errors or warnings.                                                                                                                                                                                                                           |
| Links               | Crawl the local build and the demo: zero broken internal links; every `/go/` slug redirects and counts.                                                                                                                                                                                                   |
| Responsive          | Every page at 360, 768, 1024 and 1280 px: no horizontal overflow, no wrapping nav labels, tap targets at least 44 px.                                                                                                                                                                                     |
| Forms and lists     | Every form tested for validation, loading, success and error; every list for empty and error states.                                                                                                                                                                                                      |
| Metadata            | Titles and descriptions on every page; OG image; favicon, PNG 192/512 and apple-touch icons; `sitemap.xml` and `robots.txt` excluding hub, account and auth (noindex).                                                                                                                                    |
| Copy                | Proofreading and a term list (grade names, RL-JMU IDs, "ReLoop Checked"). The claims test covers all public pages; no placeholder or test text.                                                                                                                                                           |
| Security            | All live checks true (13 + 30 + v1); the HTML/RSC leak scan finds no seeded supplier name or phone, buy price or margin; `npm audit` no high or critical (fixed or documented); the service key only in `server-only` files.                                                                              |
| Cleanup             | Dead code and routes removed, branches deleted, docs updated.                                                                                                                                                                                                                                             |
| Screenshots         | About 16 main pages at 390 and 1280 px on production and the demo, JPEG at most 200 KB each, checked for personal data.                                                                                                                                                                                   |
| Release             | CHANGELOG, tag `v1.0.0`, GitHub release, final backup, Keychain deletion, feature-freeze section, final report (PRs, gate pass/fail, Lighthouse table, both URLs, anything unfixable, a 10-minute checklist per role).                                                                                    |

---

## 9. Other approved defaults still in force (from the original 38 questions)

Simulation project `reloop-sim` and the demo site `re-loop-demo` (banner "simulation", noindex, no WhatsApp or email handoffs; `/demo` lists logins). Reference prices start empty on production and show no band until staff add them with a source and date. Hindi guide sections marked "to be checked by a native speaker". Tag label 62 x 29 mm. Account deletion: an admin approves within 30 days, purchase and handover records kept anonymised as "Deleted account". Retention: closed claims and handled deletion requests purged after 12 months, notifications after 90 days. Rate limiting by a database throttle on public form endpoints (salted IP hash, 10 per hour). Design: the business plan's palette and fonts (Outfit, Instrument Sans, JetBrains Mono), light theme only in v1. Top bar: a slim bar, "Jammu pilot, weekly pickups, WhatsApp". The hub opening stays November 2026, shown only on `/locations` and `/contact`. Recommended against: bidding, CO2 without a published factor, simulation flags in production, chart libraries (use server-rendered SVG), Leaflet on the home page, cookie sessions and `proxy.ts` in v1, a nonce-based CSP, fully dynamic categories (labels, examples and weights are editable instead), email notifications.

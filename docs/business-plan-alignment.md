# ReLoop — Aligning the website with the Business Plan

_Written 2026-10-07 and implemented the same day on branch `business-plan-alignment`. The open questions in §7 and "Decisions needed" are still open._

## Context

The **Business Plan** (Jammu pilot, Nov 2026–Apr 2027) is now the source of truth. ReLoop **buys** used and broken electronics from repair shops, retailers, institutions and households. It **grades every item A–D at one hub**, then resells A, repairs B, strips C for parts and hands D to an authorised recycler.

The website was built for a different model, an open or hybrid marketplace where others list and ReLoop moderates. That model lives in two places:

- `legacy/index.html`: the old prototype. The root `index.html` is now only a redirect to it.
- `frontend/`: the Next.js site now on `main`. Its database design in `backend/` was built for the same model.

Seller onboarding starts **14 Oct (7 days away)**. This plan says what to change, what to build, in what order, and what will not be ready by then.

**Note:** `docs/ReLoop_Business_Plan.html` is not in the repo. I worked from the attached copy. It should be committed to `docs/` so it is versioned alongside the code.

---

## 1. Gap analysis

"Legacy" = `legacy/index.html`. "Site" = `frontend/` on `main`. ✗ = contradicts the plan, ○ = missing.

| Area               | Business plan                                                                                          | Legacy                                                                                                            | Site                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Business model** | ReLoop buys stock outright, grades it at the hub and resells it. Self-listing (8%) is a side income    | ✗ Anyone submits via "Sell / List" and the listing appears straight away. The seller's contact is shown to buyers | ✗ Hybrid marketplace: individuals' listings are reviewed and "verified partners publish instantly" (ADR 0002, `backend/` trigger). ReLoop is a moderator, not the owner of the stock |
| **Grading**        | A works, B one fixable fault, C parts, D dead or hazardous                                             | ✗ 5 seller-chosen "conditions" (Working, Tested, Repairable, Parts only, End-of-life)                             | ✗ Same 5 conditions, as colour-coded badges and DB enums                                                                                                                             |
| **Item identity**  | Tag `RL-JMU-0001`, logged with source, date, category, grade, buy price and photo                      | ○ None (numeric ids)                                                                                              | ○ Slugs and UUIDs                                                                                                                                                                    |
| **Categories**     | Devices sold as A/B and parts as C. D is never sold to the public                                      | ✗ "Bulk lots" and "Recycling" are buyable categories, and recycling lots show "Request quote"                     | ✗ Same 5 categories, including a buyable "Recycling" lot                                                                                                                             |
| **Buy prices**     | A ≈45% of expected resale, B ≈25%, C flat ₹100–200, D free pickup                                      | ○ None                                                                                                            | ○ None                                                                                                                                                                               |
| **Consignment**    | Items > ₹10,000: the seller gets 70% when it sells                                                     | ○                                                                                                                 | ○                                                                                                                                                                                    |
| **Self-listing**   | 8% commission when sellers list themselves                                                             | ✗ Self-listing is the main flow and has no commission                                                             | ✗ Self-listing is the main flow and has no commission                                                                                                                                |
| **Sourcing paths** | Shops and retailers (Tue/Fri route), institutions (booked lots), households (drop-off, monthly drives) | ○ One generic submit form                                                                                         | ○ One generic "Sell" page, describing individuals vs partners                                                                                                                        |
| **Hub**            | One 250 sq ft room in the old-city market belt. Pickup there, or ₹50 delivery in Jammu                 | ○ "Collection hub: Jammu" only                                                                                    | ○ "Collecting in Jammu" only. No pickup or delivery terms                                                                                                                            |
| **Shipping**       | Jammu pickup or delivery. Only laptops and boards ship India-wide, buyer pays                          | ✗ "Buyers across India"                                                                                           | ✗ "Shipping to buyers across India" in the top bar, and "Delivered nationwide"                                                                                                       |
| **Warranty**       | 30-day warranty (in the buyer table)                                                                   | ○                                                                                                                 | ○                                                                                                                                                                                    |
| **Data wipe**      | Every phone, laptop and drive wiped and logged against its tag                                         | Partial: mentioned in the form placeholder                                                                        | Partial: FAQ and checklist                                                                                                                                                           |
| **Recycler**       | D and batteries go only to VRG Groups, Gangyal, with a weight receipt                                  | ✗ Vague "authorised channels"                                                                                     | ✗ Vague "authorised channels"                                                                                                                                                        |
| **Staff tools**    | Intake, grading, racks, 45/75-day rules, handover log, KPIs                                            | ○ None                                                                                                            | ○ None. The planned admin was a listing review queue, which doesn't fit                                                                                                              |
| **Buying flow**    | Hub pickup or delivery. Payment method not stated                                                      | ✗ Demo basket and checkout                                                                                        | Inquiry "coming soon"                                                                                                                                                                |

**Reusable as-is:** the design system, layout, header and footer, the URL-based filter pattern, `ListingCard` (becomes `ItemCard`), the badge component (becomes the grade badge), the Impact page, the legal pages, the `site.ts` business details, and the test and CI setup.

**Must be redesigned:**

- `backend/` schema: a `listings` table → an `items` inventory table
- `features/listings/model.ts`: categories and conditions → item categories and grades
- ADR 0002 (hybrid moderation) → superseded by a new ADR, "ReLoop-owned graded inventory"

---

## 2. Public site map

All copy follows §6. Prices come from data, never hard-coded in text.

| Route                                       | Purpose                                                                      | Key content                                                                                                                                                                                                                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` Home                                    | Explain the loop in one screen and send people to **Shop** or **Sell to us** | Hero: "Collect · grade · resell · recycle". Two big CTAs. Latest graded stock. Grade explainer strip. The three ways to sell. Recycler strip (once confirmed)                                                                                                                                      |
| `/shop`                                     | ReLoop's graded stock: A and B devices, plus C parts                         | Filters in the URL: grade (A/B/C), category, price, sort. Card: photo, **item ID**, **grade badge**, title, price, "30-day warranty" (see §7), "Hub pickup · ₹50 delivery in Jammu". "Ships India-wide (buyer pays)" only on laptops and boards. Sold items hidden                                 |
| `/shop/[itemId]` (e.g. `/shop/RL-JMU-0142`) | One item                                                                     | Photos, ID, grade and what it means, test checklist summary, "Data wiped" badge for storage devices, price (plus "price reduced" if cut on day 45), warranty, pickup/delivery options, "Reserve / ask about this item" (WhatsApp or phone handoff until a backend exists)                          |
| `/sell`                                     | Sell to us hub                                                               | Chooser for the 3 paths, plus consignment and self-listing explained. Buy-price rules shown plainly, but as rules, not margins                                                                                                                                                                     |
| `/sell/shops`                               | Repair shops and retailers: partner sign-up                                  | Benefits: cash on pickup, a fixed Tue/Fri route, paid repair work for partner shops. Form: shop name, owner, phone/WhatsApp, market (Raghunath Bazaar / Residency Road / Gandhi Nagar / other), what they typically have, wants repair work Y/N                                                    |
| `/sell/institutions`                        | Colleges, schools, banks, offices: pickup booking                            | What we do: free pickup (see §7 on the fee), sorting, a handover record, dead e-waste going directly to the authorised recycler in their name. Form: institution, contact, approx. items by type, preferred dates                                                                                  |
| `/sell/home`                                | Households: drop-off with a price estimate                                   | **Estimator:** pick category, model/age and condition answers → likely grade → range: A ≈45% of expected resale, B ≈25%, C ₹100–200, D "free, safe disposal". Always labelled "indicative, final price after testing at the hub". Shows hub address and hours (once known) and the next drive date |
| `/sell/consignment`                         | Items worth more than ₹10,000                                                | How it works: we test, list and sell, and you receive **70%** when it sells. Request form                                                                                                                                                                                                          |
| `/sell/list-yourself`                       | Self-listing, 8% commission                                                  | Explained. Marked **"coming later"** (see §5)                                                                                                                                                                                                                                                      |
| `/how-it-works`                             | The loop                                                                     | Six hub steps (tag → grade → wipe → rack → list within 48 h → dispatch), the four outcomes A/B/C/D, data-wipe policy, how long items sit (public version: "graded within 24 h, listed within 48 h")                                                                                                |
| `/where-scrap-goes`                         | Recycling transparency                                                       | D-grade and batteries go only to the authorised recycler, weighed, with a receipt per handover. Optionally running totals (kg handed over), taken from the handover log. Names VRG **only once the agreement is confirmed**                                                                        |
| `/warranty`                                 | Warranty, returns, delivery                                                  | 30-day warranty terms (scope per §7), ₹50 Jammu delivery, pickup, India shipping rule                                                                                                                                                                                                              |
| `/impact`, `/contact`, `/privacy`, `/terms` | Keep                                                                         | Update the copy to the buying model. The privacy policy must add seller-side data (shop and institution contacts, IDs for purchases from individuals if collected)                                                                                                                                 |

**Remove:** basket/checkout, "Bulk lots" and "Recycling" as buyable categories, the hybrid "verified partners publish instantly" copy, and "buyers across India".

---

## 3. Staff (hub) side

Routes under `/hub`. **Not public.** See the warning in §4: until there is real auth, the hub tool runs only on the hub laptop (a local build or a password-protected preview), never on the public site.

**Intake (`/hub/intake`):**

- The next ID is auto-assigned (`RL-JMU-` + 4 digits, zero-padded)
- Source type + partner/institution/household picker
- Category, brand/model, description
- Buy mode (cash / consignment / free) and buy price
- Photo: compressed client-side to ≤ 200 KB
- Weight (kg), for anything heading to D
- Battery/hazard flag
- Printable tag label

**Grading (`/hub/items/[id]`):**

- Category checklist (powers on, display, battery health, ports, keyboard, …)
- Grade A/B/C/D, fault notes
- Data wipe: method, done, by, at. Required for phones, laptops and drives before listing
- Rack location

**Status flow:**

```
received → graded ─┬─ A → listed ─────────────────┐
                   ├─ B → out_for_repair → listed ─┤→ reserved → sold → (warranty_claim → resolved)
                   ├─ C → stripping → parts created (new IDs, parentId) → listed; shell → D
                   └─ D → in_scrap_cage → handed_over (handover id)
listed --day 45--> price cut 20% (once)    listed --day 75--> downgraded to C → stripping
consignment items: listed → sold → payout_due (70%) → paid
```

**Automatic rules** (run by `applyAutomaticRules(now)` on every hub page load; each change is written to the item's event log):

- **Day 45 unsold:** current price × 0.80, once. Flags "include in this week's Instagram post"
- **Day 75 unsold:** grade → C, status → stripping
- **Alerts** (shown, not applied):
  - not graded within 24 h of arrival
  - A or B not listed within 48 h of grading
  - scrap cage ≥ 100 kg, or ≥ 14 days since the last handover
  - batteries waiting and no battery handover in 7 days
- **Day count starts at listing:** "unsold" is measured from `listedAt`, not arrival, because the plan's clock is about sale time. Confirm (§7).

**Recycler handover log (`/hub/handovers`):**

- Date, recycler, kg per category (batteries separate), item IDs included
- Receipt number and receipt photo
- Rate per kg and amount received
- "On behalf of" institution, for direct institutional handovers

**Partners, institutions, bookings, estimates, repair jobs, consignments:** simple list and edit screens.

**Dashboard (`/hub`)**, per month, with the plan's targets beside each figure:

- Items in (target 280 by month 6)
- **Reuse %** = (A + B + C) ÷ graded (target ≥ 65%)
- **Average stock age** of items on the racks (target < 30 days)
- **Scrap kg** handed over (target: 100% of D with a receipt)
- Active partner shops (target 25)
- Grade mix vs the planned 15/25/30/30
- Sell-through

Internal only: buy/sell totals may show here, never on the public site.

**Backup:** "Export all (JSON/CSV)" and "Import", because browser storage can be wiped.

---

## 4. Data model and data-access functions

**Warning: the localStorage limit, read this first.** localStorage lives in one browser on one device:

- Items the staff log on the hub laptop will **not** appear for buyers on their phones.
- Form submissions from shops, institutions and households will **not** reach staff.
- Two staff devices would create **duplicate IDs**.

So localStorage can serve as a working single-laptop hub tool and as a demo, but **not** as the backend for a public shop or for public sign-up forms. Interim options until Supabase is ready, in order of preference:

1. Public forms send a prefilled WhatsApp message or email to the ReLoop number/inbox (no backend needed).
2. The public shop reads a **published snapshot**. The hub's "Publish stock" exports `items.json` (public fields only), which is committed to `frontend/` and redeployed.
3. Supabase, as soon as the teammate's project exists. Only the adapter changes.

**Shape:** one module, `frontend/src/features/hub/store/`.

- `index.ts` exports the named functions below.
- `local.ts` is the localStorage adapter (versioned key `reloop:v1:*`, try/catch, an in-memory fallback, quota errors surfaced to the UI).
- Later, `supabase.ts` implements the same functions.
- Every function is `async` today, so swapping adapters changes no callers.
- Pure helpers (`estimateBuyPrice`, `nextItemId`, rule logic) live outside the store and are unit-tested.

**Functions:**

- Items: `getItems(filter)`, `getItem(id)`, `createItem(intake)` (assigns the ID), `saveItem(item)`, `setItemStatus(id, status, note)`, `applyAutomaticRules(now)`
- Partners and institutions: `getPartners`, `savePartner`, `getInstitutions`, `saveInstitution`
- Bookings: `getBookings`, `saveBooking`
- Household estimates and drop-offs: `getDropoffs`, `saveDropoff`
- Repair jobs: `getRepairJobs`, `saveRepairJob`
- Consignments: `getConsignments`, `saveConsignment`
- Orders and reservations: `getOrders`, `saveOrder`
- Handovers: `getHandovers`, `saveHandover`
- Dashboard: `getDashboardStats(month)`
- Backup and publish: `exportAll`, `importAll`, `publishShopSnapshot`

Money is in integer paise and dates are ISO strings throughout.

| Record                           | Fields                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Item**                         | `id` (RL-JMU-0001), `receivedAt`, `source` {type: repair_shop · retailer · institution · household, partnerId?, institutionId?, dropoffId?}, `category` (phone, laptop, desktop, monitor, tv, printer, ups, small_appliance, accessory, part), `brand`, `model`, `description`, `photos[]` (compressed data URL or later a storage path), `weightKg?`, `hazard` (battery / none), `grade` (A–D, null until graded), `gradedAt`, `gradedBy`, `checklist` {item: pass/fail}, `faults`, `dataWipe` {required, method: reset_overwrite · drive_wipe · drilled, doneAt, by}, `rack`, `buyMode` (cash · consignment · free), `buyPrice`, `expectedResale`, `listPrice`, `currentPrice`, `priceCutAt?`, `status`, `listedAt?`, `reservedFor?`, `soldAt?`, `soldPrice?`, `fulfilment` (pickup · delivery_jammu · ship_india), `warrantyUntil?`, `parentId?` (part of a C item), `consignmentId?`, `handoverId?`, `events[]` {at, type, by, note} |
| **Partner** (shop/retailer)      | `id`, `type` (repair_shop · retailer), `name`, `owner`, `phone`, `market`, `address`, `routeDay` (Tue · Fri), `isRepairPartner`, `repairRates` {fault: fee}, `status` (lead · active · paused), `joinedAt`, `notes`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Institution**                  | `id`, `name`, `type` (college · school · bank · office · other), `contactName`, `phone`, `email`, `isAnchor`, `notes`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Booking** (institution pickup) | `id`, `institutionId`, `requestedFor`, `estItems` {category: n}, `status` (requested · scheduled · collected · cancelled), `fee`, `handoverId?`, `itemIds[]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Dropoff** (household)          | `id`, `name`, `phone`, `items[]` {category, model, ageYears, answers, estimatedGrade, estimateMin, estimateMax}, `status` (estimated · dropped_off · paid · declined), `itemIds[]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **RepairJob**                    | `id`, `itemId`, `partnerId`, `fault`, `fee`, `sentAt`, `returnedAt?`, `outcome` (fixed · not_fixable)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Consignment**                  | `id`, `itemId`, `consignorName`, `phone`, `agreedPrice`, `sharePct` (70), `startedAt`, `endsAt?`, `status` (active · sold · payout_due · paid · returned), `payout?`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Order** (reservation)          | `id`, `itemId`, `buyerName`, `phone`, `fulfilment`, `deliveryFee` (5000 paise for Jammu delivery), `status` (reserved · completed · cancelled), `paidVia?`, `createdAt`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Handover**                     | `id`, `date`, `recycler`, `onBehalfOf?` (institution), `kgByCategory` {…}, `batteryKg`, `itemIds[]`, `receiptNo`, `receiptPhoto`, `ratePerKg?`, `amount?`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Settings**                     | `nextItemNumber`, `hubCode` ("JMU"), `buyRules` {A: 0.45, B: 0.25, C: [10000, 20000] paise, D: 0}, `consignmentThreshold` (1,000,000 paise), `consignmentShare` (0.70), `selfListCommission` (0.08), `jammuDeliveryFee` (5000), `priceCutDay` (45), `priceCutPct` (0.20), `downgradeDay` (75), `scrapKgTrigger` (100), `scrapDaysTrigger` (14)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Rules are stored as **settings, not constants**, so the team can tune them without code changes, and the plan's numbers appear in exactly one place.

**Backend follow-up (not for 14 Oct):** rewrite `backend/` before any migration is applied to a real Supabase project:

- `items`, `partners`, `institutions`, `bookings`, `dropoffs`, `repair_jobs`, `consignments`, `orders`, `handovers`
- RLS: the public reads only listed items' public fields; staff read and write everything
- The day-45/75 rules as a scheduled job

Write a new ADR, and mark ADR 0002 as superseded.

---

## 5. Priorities

Today is 7 Oct, and 14 Oct is 5 working days away. Onboarding sellers needs the **sell side and intake**. It does not need the shop: there is no graded stock yet, and the plan has the marketplace going live in months 1–2 (Nov–Dec).

### Must-have by 14 Oct

1. **Copy correction across the site** (§6): remove the P2P/hybrid language, "across India", "verified partners publish instantly", the Bulk-lots and Recycling buyable categories, and the basket.
2. **`/sell` + `/sell/shops` + `/sell/institutions` + `/sell/home`** with the buy-price rules. Forms hand off by **WhatsApp/email** (no backend needed). _Needs from you: the ReLoop WhatsApp number or email._
3. **Household price estimator** (pure function, unit-tested, "indicative" label). _Needs: an expected-resale reference table per category (§7). Without it, the estimator can show only the rule ("about 45% of what we expect to resell it for"), not rupee figures._
4. **Hub intake tool, single laptop:** intake with auto ID, source, category, grade, buy price, photo; item list; status changes; JSON/CSV export. Run locally, not deployed publicly.
5. **`/how-it-works`** rewritten around the loop and the A–D grades.

### Should-have, before the shop opens (Nov)

- `/shop` and `/shop/[itemId]` from a published snapshot, or Supabase if ready
- `/warranty` (delivery and returns)
- Item detail with checklist and data-wipe badge
- Automatic 45/75-day rules and the alert list
- Repair jobs, partner list, booking list
- `/sell/consignment` (request form plus consignment tracking)
- `/where-scrap-goes`, once the VRG agreement is confirmed
- Recycler handover log
- Dashboard

### Later

- Supabase backend rewrite and staff login (replaces the localStorage limits)
- Online reservations and payment
- **Self-listing at 8%:** needs accounts, moderation, payments and GST/e-commerce rules
- India shipping flow
- Multi-hub support (e.g. Kathua)
- Refurbisher certificate features (after CPCB registration)
- Instagram feed integration

### What will not fit before 14 Oct

- The public shop with real stock
- Any form that saves into a database
- Multi-device staff use
- Staff login
- Dashboard, automatic rules, handover log, consignment tracking
- Self-listing
- Payments

---

## 6. Content rules, and claims the plan does not support

**Rules for all copy:**

- Use the plan's numbers exactly: 45% / 25% / ₹100–200 / free pickup; 70% consignment above ₹10,000; 8% commission; ₹50 Jammu delivery; 30-day warranty; graded within 24 h; listed within 48 h; 20% cut at day 45; to C at day 75.
- **Never show publicly:** the ₹73k setup cost, margins per item, average buy/sale prices, the P&L, break-even, payback, rent, salaries or fixed costs.
- **Never claim** that ReLoop is authorised, registered, certified or a refurbisher. The plan says JKPCC consent and CPCB refurbisher registration are only applied for from month 6. Say "we hand scrap to an authorised recycler", not "we are authorised".

**Claims the current site makes that the plan does not support (remove or rewrite):**

1. "Shipping to buyers across India" / "Delivered nationwide" / "connected to buyers across India". The plan ships only laptops and boards, at the buyer's cost.
2. "Verified partners publish instantly" / "Individuals get every listing reviewed… usually within a working day". Not the plan's model.
3. "Businesses and collectors are vetted" / "Verified partners".
4. "5 routes: reuse categories, from devices to bulk lots". The plan has 4 outcomes (A–D) and doesn't sell bulk lots.
5. "Online payments are planned for a later release". The plan says nothing about payments.
6. The "End-of-life electronics pickup lot", sold as an item. D is never sold to the public.
7. "Up to 8 photos, 5 MB each" (for sellers). Sellers don't list in this model.
8. "Collection hub: Jammu, J&K" before the hub is rented. No address exists yet.

**Claims the new pages would make that need confirmation first:** 9. **Naming VRG Groups, Gangyal** as _our_ recycler. The plan lists the agreement terms (per-kg rate, minimum lot) as still to come from Subgroup 2's calls. Name them only once the agreement is in place. Until then: "a JKPCC-authorised dismantler". 10. **Naming IIM Jammu or other campuses** as partners before they sign. 11. **The 30-day warranty applying to every grade.** The plan mentions it only for students buying devices; it is not stated for C parts (see §7). 12. **Exact household buy prices in rupees.** The plan gives percentages and averages, not per-model prices. 13. **"Instant price" for households.** A price needs testing, so it can only be an estimate until then. 14. **The national e-waste figures** on `/impact` (1.75M / 1.94M tonnes). They aren't in the business plan; they're carried over from the prototype with their own government source. Keep them only with that citation. 15. **The privacy page's "acknowledge in 24 hours, resolve in 15 days"** timelines. Not in the plan, so they must be confirmed by whoever owns grievances. 16. **"Hub pickup" and drop-off** before the hub opens. The pilot starts in Nov, but onboarding starts 14 Oct (§7).

---

## 7. Contradictions and gaps in the business plan

1. **Per-item contribution doesn't match the P&L.** At the planned 15/25/30/30 mix, the margin per item is **₹651.5**; full workings are in the box below. The footnote says **₹420**, but the monthly table implies **₹475–547** (e.g. ₹149,560 ÷ 280 = ₹534). Break-even is therefore **~76–85 items**, not 96. The direction is the same, but the figures disagree.
2. **Institutions: "a few times a year" vs "one lot a month per institution".** With 3 anchors at one lot a month, that's ~20 items per lot to reach 60 a month.
3. **Institution pickup is called "free"** (why they say yes) **but also listed as ₹3,000 a lot** in other income.
4. **"Every item passes through one hub" vs self-listing at 8%.** Self-listed items would bypass grading, warranty and data wipe. Do they?
5. **The stock-on-racks maths:** "280 a month and 75 days max → about 300 items". 280 a month held up to 75 days could mean ~690 items. About 300 implies an _average_ stay of ~32 days, which is itself above the < 30-day KPI.
6. **The 30-day warranty isn't costed:** there's no line for returns or repairs in the P&L. Its scope by grade is also unclear.
7. **Delivery "at cost" is listed as income.** It contributes ₹0.
8. **Onboarding on 14 Oct vs the pilot starting in Nov.** The hub isn't in the timeline before Nov. Household drop-off and pickup promises need the hub open, an address and hours.
9. **The hub location covers two markets, but the route includes Gandhi Nagar,** which is not within the stated "10-minute ride of both markets".
10. **Compliance grey areas to check with JKPCC or an advisor before launch:**
    - (a) Buying used equipment from **bulk consumers** (colleges, banks) as an unregistered business, when the rules say bulk consumers hand e-waste only to registered entities. Is working equipment "e-waste" here?
    - (b) **C-grade part removal**, which may count as dismantling and need authorisation.
    - (c) **Storing batteries and scrap** (hazardous) at the hub for up to 14 days before holding any authorisation.
11. **"Unsold" day count:** from arrival or from listing? The 45/75-day rules and the < 30-day stock-age KPI read differently depending on which.
12. **No expected-resale reference prices** per category or model, so the buy-price rules can't produce rupee figures without one.
13. **Undefined terms:**
    - Payment method, receipts or invoices, and GST: an 8% commission likely triggers e-commerce GST/TCS rules.
    - Consignment duration, who sets the price, and what happens if it doesn't sell.
    - Whether ReLoop needs seller ID for purchases from individuals (anti-theft due diligence).

> **Issue 1 workings:** 0.15 × 1,600 + 0.25 × 1,250 + 0.30 × 290 + 0.30 × 40 = 240 + 312.5 + 87 + 12 = **₹651.5**. ₹420 implies a sell-through of only ~64%, below the stated 75–85%.

---

## Decisions needed from the team (blocking or near-blocking)

| #   | Decision                                                                    | Blocks                                        |
| --- | --------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | WhatsApp number and/or email for form handoffs                              | Must-have 2                                   |
| 2   | Expected-resale reference prices per category (even rough bands)            | Rupee estimates in the estimator              |
| 3   | Hub address, hours and opening date, and where drop-offs go before it opens | `/sell/home`, pickup copy                     |
| 4   | VRG agreement status                                                        | Naming the recycler publicly                  |
| 5   | Warranty scope by grade                                                     | Shop and warranty copy                        |
| 6   | Whether "unsold" days count from arrival or from listing                    | Automatic rules                               |
| 7   | Institution pickup: free or ₹3,000                                          | Institutions page copy                        |
| 8   | Self-listing: through the hub or not                                        | Whether `/sell/list-yourself` is shown at all |

## Verification (when the work is built)

- **Unit tests:**
  - `estimateBuyPrice` for every grade and the ₹10,000 consignment threshold
  - `nextItemId` padding and sequence
  - `applyAutomaticRules` at day 44/45/74/75 (one price cut only, downgrade to C)
  - reuse % and stock age calculations
  - store adapter round-trip, plus export/import
- **Browser tests:**
  - Sell paths: each form builds the correct WhatsApp/email message
  - Intake: an ID is assigned → grade → list → appears in the snapshot
  - Shop filter by grade
  - The accessibility scan on all new pages
- **Copy check:** a test greps the built site for banned phrases ("across India", "nationwide", "authorised refurbisher", "certified", "publish instantly", "₹73", "margin") and fails if any appear.
- **Run** `npm run check` and `npm run test:e2e` from the repo root.

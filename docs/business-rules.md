# Business rules used by the website

Source: Business Plan v2 (Jammu pilot, November 2026 to April 2027). The public-safe summary is `docs/business-plan-v2-summary.md`; the full plan is private. In code, every public rule below lives in **`frontend/src/config/business-rules.ts`**; the rate card, commission, lot fee and route days are public **settings** (editable in `/hub/settings`). Change a rule there, not in page text.

| Rule                  | Value                                                                                             | Used in                        |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------ |
| Item tag              | `RL-JMU-0001` (4+ digits), for devices and parts                                                  | Hub intake, shop               |
| Rate card per kg      | screens ₹170, batteries ₹800, dead motherboards ₹130, everything else ₹5 (setting)                | `/rate-card`, weigh-ins, print |
| Working parts         | tested and priced one by one, or listed by the shop on the Parts Exchange                         | Hub, Parts Exchange            |
| Parts commission      | **12%** when a shop-listed part sells, shown to shops only (setting)                              | Parts Exchange                 |
| Institution lot       | **₹3,000** a lot: pickup, sorting on site, a handover record (setting)                            | `/sell/institutions`           |
| Delivery              | **₹50** in Jammu city (the Jammu Municipal Corporation area); hub pickup free                     | Shop, warranty page            |
| Shipping              | none: nothing is sold or shipped outside Jammu                                                    | Shop                           |
| Warranty              | **30 days** on grade A and B devices                                                              | Shop, warranty page            |
| Parts return          | **7 days**: a fault, doesn't work when fitted, doesn't fit the stated model, undamaged            | Warranty page, hub             |
| Test within           | 24 hours of arrival                                                                               | Hub alerts                     |
| List within           | 48 hours (parts and A/B devices)                                                                  | Hub alerts                     |
| Part unsold, day 30   | price cut **25%**, once (rounded to ₹10); a shop's own part gets a reminder instead               | Automatic hub rule             |
| Device unsold, day 45 | A or B becomes **C** and is stripped for parts                                                    | Automatic hub rule             |
| Part unsold, day 60   | "consider scrap" alert                                                                            | Hub alerts                     |
| Scrap bins            | a bin goes to VRRG Group at **100 kg** or **14 days** (alert at 80 kg)                            | Hub bins                       |
| Batteries             | handed over **every week**, whatever the quantity                                                 | Hub bins                       |
| Pilot targets         | 40 partner shops, about 500 kg a month, 100% of scrap to VRRG on receipt, 0 kg to outside dealers | Hub KPIs, public counter       |
| Stage gate one        | 200 kg in a month with at most 4 missed weekly pickups                                            | `/hub/kpis`                    |

The money targets (tested parts sold a month, margins, VRRG rates) are staff-only settings (`finance.*`, `vrg.*`) and are **not** in this repository.

## Interpretations made where the plan is unclear

1. **Counting days:** "unsold" days run from the day an item is **listed**. Both rules are idempotent (a part is cut once; a device moves to C once). Items already past a threshold when the rules start get a grace period (`stock.grace_until`).
2. **Households:** not a source, and not accepted by any path. Households and students can buy.
3. **Excluded equipment:** TVs, small appliances, printers and UPS units are not bought, carried or recorded, institutions included. Institutions are pointed to VRRG Group directly.
4. **Dismantling partner:** named once, "VRRG Group, Gangyal". Public copy never says ReLoop is authorised, registered, approved or endorsed by any authority.

## Never shown on the public site

Per-device buy prices, VRRG rates, the P&L, set-up and fixed costs, margins, benchmarks and the monthly parts target. The e2e copy test fails if banned phrases appear, and the live checks prove that no `finance.*` or `vrg.*` setting is public.

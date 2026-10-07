# Business rules used by the website

Source: the ReLoop Business Plan (Jammu pilot, Nov 2026 – Apr 2027). In code, every number below lives in **`frontend/src/config/business-rules.ts`**. Change it there, not in page text.

| Rule                    | Value                                                                                          | Used in                        |
| ----------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------ |
| Item tag                | `RL-JMU-0001` (4+ digits)                                                                      | Hub intake, shop               |
| Grade A buy price       | about **45%** of expected resale                                                               | Estimator, intake price list   |
| Grade B buy price       | about **25%** of expected resale                                                               | Estimator, intake price list   |
| Grade C buy price       | flat **₹100–200**                                                                              | Estimator, intake              |
| Grade D                 | free pickup, nothing paid                                                                      | Estimator, intake              |
| Consignment             | items worth more than **₹10,000**; seller gets **70%** on sale                                 | `/sell/consignment`, estimator |
| Self-listing commission | **8%** (not offered yet)                                                                       | `/sell/list-yourself`          |
| Jammu delivery          | **₹50**; hub pickup free                                                                       | Shop, warranty page            |
| Shipping across India   | laptops and boards only, buyer pays                                                            | Shop                           |
| Warranty                | **30 days**, on grade A and B devices (not parts)                                              | Shop, warranty page            |
| Grade within            | 24 hours of arrival                                                                            | Hub alerts                     |
| List within             | 48 hours of grading (A and B)                                                                  | Hub alerts                     |
| Unsold, day 45          | price cut **20%**, once                                                                        | Automatic hub rule             |
| Unsold, day 75          | downgraded to **C**, stripped for parts                                                        | Automatic hub rule             |
| Scrap handover          | at **100 kg** or every **14 days**                                                             | Hub alerts                     |
| Batteries               | handed over **every week**                                                                     | Hub alerts                     |
| Pilot targets           | 280 items/month by month 6; ≥ 65% reused; < 30 days average stock age; 25 active partner shops | Hub dashboard                  |

## Interpretations made where the plan is unclear

Confirm or change these (see `docs/business-plan-alignment.md` §7):

1. **Warranty scope:** A and B devices only. The plan mentions the warranty only for students buying devices, and C parts are not covered.
2. **"Unsold" days** are counted from the day an item is **listed**, not from when it arrived.
3. **Institution pickup:** the site says neither "free" nor "₹3,000", only that charges are confirmed before booking. The plan says both.
4. **Recycler:** not named publicly until the agreement is confirmed. The site says "a recycler authorised by the J&K Pollution Control Committee".
5. **Self-listing:** shown as "coming later". It would bypass the hub, which conflicts with "every item passes through one hub".

## Never shown on the public site

Setup cost, margins, average buy/sale prices, the P&L, break-even, payback, rent and salaries. A browser test (`frontend/tests/e2e/shop.spec.ts`) fails if certain phrases appear.

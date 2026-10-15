# ADR 0005: Parts Exchange (staff-approved partner listings on commission) and a scrap ledger

- **Status:** Accepted (2026-10-15). **Partly supersedes** [ADR 0004](0004-reloop-owned-graded-inventory.md).

## Context

Business Plan v2 changes what ReLoop is. The primary sellers are mobile and laptop repair shops, then retailers and exchange stores, then institutions. They bring scrap by the kilo on a fixed weekly route, and working parts that are only found by testing. Households are not a source. TVs, small appliances, printers and UPS units are not taken. Nothing is sold or shipped outside Jammu. The plan also adds a Jammu Parts Exchange where verified shops list parts they harvest.

ADR 0004 assumed that every intake is a tagged item bought outright, with consignment and self-listing as later options.

## Decision

1. **Devices stay purchase-only.** ReLoop buys devices outright after testing, tags them and grades them A to D. Consignment (ADR 0004's over-₹10,000 path) and the 8% self-listing rule are dropped. The `consignments` table and the `consignment` buy mode stay in the schema for history, are documented as unused, and new rows are blocked.
2. **The Parts Exchange is a staff-approved partner listing on commission.**
   - A verified shop owner linked to an active partner lists a part from their account and agrees to be named on it.
   - The part comes to the hub on the route, and staff test it, tag it (source `partner_listing`, buy price 0, commission rate stored on the row), wipe it where needed and approve it.
   - It is shown as "Listed by a partner shop, tested by ReLoop". The buyer pays ReLoop offline; ReLoop is the seller of record.
   - ReLoop records a 12% commission when it sells, handles the 7-day return, and pays the shop its 88% share after day 7 (not if the part is refunded).
   - The commission is a published term shown to shops, never to buyers.
3. **Two kinds of stock.** Tagged items (devices and parts) live in `items`. Untagged scrap lives in a **kg ledger** (`scrap_ledger`) with four bins (screens, boards, other, D devices) and a battery cabinet, replacing the single scrap cage. Scrap bags get a bin and a kg label, not an RL-JMU tag.
4. **Scrap is paid by weight.** The public rate card per kg is a setting (`rate_card.*`). Every weigh-in keeps a snapshot of the rates used. The counter weight is the paid weight; a hub re-weigh difference is logged and never charged back. Likely-working parts go in a "to test" bag and are paid as parts, within 24 hours, on their own receipt line.
5. **One dismantling partner.** Every kilo of scrap and every battery goes to VRRG Group, Gangyal, on a weight receipt. A bin is handed over at 100 kg or 14 days; batteries every week. Dead e-waste from an institution goes straight to VRRG Group on its weight receipt in the institution's name, outside the bins and the ledger. ReLoop earns only the lot fee.
6. **Business data stays private.** The rate card, the commission and the lot fee are public. Per-device buy prices, VRRG rates, benchmarks and every figure from the plan's money section live only in staff-only settings (`finance.*`, `vrg.*`), never in files, public views or the public client.
7. **Enum values are never dropped.** Removed values (household sources, the four excluded categories, shipping, consignment) stay valid for old rows; triggers block new use.

## Consequences

- New tables: `scrap_weighins`, `scrap_ledger`, `part_listings`, `exchange_sales`, `institution_lots`, `ownership_declarations`, `dealer_reports`, `receipt_counters`. Payouts have exactly one source (a lot, a weigh-in, an exchange sale or an institution lot) and a private receipt token.
- ADR 0004's "every intake is a tagged item", its household and consignment paths, and its "authorised recycler" wording no longer apply. Its tag scheme, grading and hub tool stay.
- Phase 2 registration is planned from month 6 and appears only as one line in `docs/known-limitations.md`.

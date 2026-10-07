# ADR 0004: ReLoop-owned, graded inventory

- **Status:** Accepted (2026-10-07). **Supersedes** [ADR 0002](0002-hybrid-moderation.md).

## Context

The Business Plan became the source of truth for what ReLoop is. ReLoop **buys** used and broken electronics from repair shops, retailers, institutions and households. It grades every item A–D at one hub in Jammu, then resells A, repairs B, strips C for parts and hands D to an authorised recycler. The earlier hybrid marketplace (members list items; verified partners publish directly) does not match that model.

## Decision

- The public site sells **ReLoop's own graded stock**. Every item has an `RL-JMU-0001` tag and a grade.
- Sellers don't list items. They **sell to ReLoop** through one of three paths (partner shops, institution pickups, household drop-offs), plus consignment over ₹10,000. Self-listing at 8% is deferred.
- A staff **hub tool** (`/hub`) handles intake, grading, data wipe, listing, repair, stripping, the scrap cage, recycler handovers and the pilot dashboard.
- Until the shared database exists:
  - hub data lives in the hub laptop's browser storage;
  - the public shop reads a **published stock file** (`frontend/src/data/shop-snapshot.json`) exported from the hub;
  - public forms hand off to WhatsApp or email.

## Consequences

- `backend/` (designed for the hybrid model) must be **rewritten before it is applied** to a real Supabase project: `items`, `partners`, `institutions`, `handovers`, `repair_jobs`, `consignments`, `submissions`, with staff-only writes and public reads of listed items' public fields.
- Only the data layer (`frontend/src/features/inventory/store`) and `features/shop/queries.ts` change when Supabase arrives.
- Browser storage is per device: one hub laptop, with daily backups, until then.

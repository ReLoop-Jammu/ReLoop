# ADR 0002: Hybrid moderation for listings

- **Status:** Superseded by [ADR 0004](0004-reloop-owned-graded-inventory.md) on 2026-10-07. ReLoop buys and grades its own stock; it is not a hybrid marketplace.

## Context

ReLoop's promise is verified, trustworthy inventory, but requiring admin review of every listing slows trusted partners down.

## Decision

- Listings from a member whose **organization is verified** by ReLoop publish immediately.
- All other listings enter `pending_review` and need admin approval.
- This is enforced by a **Postgres trigger + RLS**, so the browser cannot bypass it.
- "Partner" is a verified organization linked to a normal account, not a separate account type.

## Why

- It keeps quality control for unknown sellers while letting known businesses, colleges and collectors move fast.
- Enforcing it in the database means a bug in the UI cannot publish unreviewed items.

## Alternatives rejected

- **Fully ReLoop-managed:** every item waits for review, so it doesn't scale for partners.
- **Open peer-to-peer:** no quality control, which conflicts with the brand promise and e-waste compliance.

## Consequences

- Admins need a review queue and a partner-verification flow (Phase 6).
- Every approve, reject or verify action is recorded in `audit_log`.
- Admins can suspend a partner's verification if its listing quality drops.

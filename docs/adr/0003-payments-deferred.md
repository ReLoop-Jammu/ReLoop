# ADR 0003: Inquiries first, online payments later

- **Status:** Accepted (2026-09-30)

## Context

Used and e-waste items often need inspection, negotiation and pickup coordination. Online payments also add legal, GST and refund work.

## Decision

- At launch, buyers send **inquiries** (and a basket acts as a multi-item inquiry), and ReLoop completes sales offline.
- **Razorpay** is the planned payment provider for a later phase.
- The data model reserves `orders`, `order_items` and `payments` tables for that phase but doesn't build them yet.

## Why

- It gets the marketplace live sooner, with less compliance risk.
- It fits how used-electronics sales actually happen: condition checks come before payment.

## Alternatives rejected

- **Payments from day one:** more scope, GST and refund handling before product-market fit.
- **Never online payments:** would limit growth, so the architecture keeps the slot open.

## Consequences

- Inquiry handling (admin inbox, statuses, email notifications) must be solid, because it is the sales channel.
- Payments get their own plan and ADR when that phase starts.

# Security report, 2026-10-14

Based on the live read-only check of 2026-10-13: [live-check-2026-10-13.md](live-check-2026-10-13.md) and `backend/supabase/live-schema-2026-10-13.sql`.

- **Each finding was reproduced** in PGlite on a database built from the live schema; see `backend/tests/live.test.mjs`. Nothing was run against production.
- **Fixes:** `supabase-fixes/2026-10-14.sql` holds the fixes, written but **not yet run**. Repo migration `20261014000001` makes the same changes.

Severity: **High** means data that should be private is public now. **Medium** means a rule can be bypassed or abused now. **Low** means hardening, not exploitable today.

## Findings

| #   | Severity | Finding                                                                           | Fixed by                         |
| --- | -------- | --------------------------------------------------------------------------------- | -------------------------------- |
| 1   | High     | Anyone can read listings' purchase cost, processing cost and internal notes       | Fix script block 4a              |
| 2   | Medium   | Unverified shop owners can insert submissions directly, with any status or price  | Block 4b                         |
| 3   | Medium   | Anyone can create orders and enquiries with any status, amount or contact details | Block 4c                         |
| 4   | Medium   | Email confirmation is off                                                         | Dashboard setting (not SQL)      |
| 5   | Medium   | Preview deployments use the production database and service-role key              | Vercel settings (not in this PR) |
| 6   | Low      | Shop owners can't change their own verification, but only RLS stops them          | Block 4f (guard trigger)         |
| 7   | Low      | Visitors and users can't write listings or categories, but hold unneeded grants   | Block 4d                         |
| 8   | Low      | The public `Images` bucket has no size or file-type limit                         | Block 4i                         |
| 9   | Low      | SECURITY DEFINER functions: none is abusable; the trigger function is executable  | Blocks 4e, 4h                    |
| 10  | Low      | Shop owners can read ReLoop's internal notes on their own submissions             | Block 4b                         |
| 11  | n/a      | The hub tables are missing from the live database (functional, not security)      | Fix script block 1               |

### 1. Listing costs and internal notes are public (High)

`listings` has the policy "Public can view active listings" (`status = 'Active'`). `anon` and `authenticated` have SELECT on **every** column. So anyone with the public key can request `purchase_cost`, `processing_cost` and `internal_notes` for every active listing; there are 5 live today. That breaks the rule against publishing internal financials.

**Fix:** select only the public columns: id, title, description, category, brand, model, condition, price, stock, image, status, featured, grade and dates. The shop already asks for only those.

### 2. Shop verification can be bypassed (Medium)

The site's `/api/shop-submissions` route correctly checks that the shop is `verified`. But the live policy "Shop owners can submit items" lets any signed-in user insert into `shop_submissions` directly, as long as `shop_owner_id = auth.uid()`. That includes a **pending** or **rejected** shop owner.

- They can set `status` (for example `Purchased`), `purchase_price`, `internal_notes` and `purchased_at` themselves.
- Buyers are stopped only by the foreign key to `shop_owners`.

**Fix:** drop the policy and revoke INSERT. The server route uses the service-role key, so the site keeps working.

### 3. Open inserts on orders and enquiries (Medium)

"Anyone can create orders" and "Anyone can create enquiries" allow anonymous inserts with `with check (true)`. Anyone can create rows with any status (for example `Completed`), any `total_amount`, and anyone's name, email or phone. That opens the door to spam, and to storing personal data nobody consented to. The site doesn't use either table.

**Fix:** drop both policies and revoke INSERT. A future checkout or enquiry form should go through a server route or a narrow policy.

### 4. Email confirmation is off (Medium)

`mailer_autoconfirm` is `true`. Anyone can register with an email address they don't own, and that unchecked address is copied into `shop_owners.email`. One live account is unconfirmed.

**Fix:** in Supabase, go to Authentication → Sign In / Providers → Email, and switch on "Confirm email". Check the confirmation email sender and template first.

### 5. Preview shares production (Medium)

Vercel's Preview environment holds the same Supabase URL, service-role key, JWT secret and Postgres password as Production. Any branch preview, and anyone who can open one, works on live data.

**Fix:** use a separate Supabase project or branch for Preview. Until then, never run e2e tests, seeds or migrations against a preview.

### 6. Can a shop owner change their own `verification_status`? No (Low)

`shop_owners` has RLS on. Owners have only SELECT policies. Writes need `is_admin()`, which needs an active `admin_users` row, and `admin_users` rows can only be added by an existing admin; there are none live.

The column grants do allow UPDATE on `verification_status`, so one careless future policy, such as "owners edit their own shop", would open it.

**Fix:** a trigger rejects changes to `verification_status`, `verified_at`, `reviewed_by` and `review_notes` unless the caller is an admin or the dashboard.

### 7. Can visitors or users write `listings` or `categories`? No (Low)

Every write policy on both tables requires `is_admin()`. `anon` and `authenticated` do still hold TRUNCATE, TRIGGER and REFERENCES on every table. TRUNCATE ignores RLS, but the API can't issue it, and those roles can't log in directly.

**Fix:** revoke the three privileges, and revoke all visitor access to account and back-office tables.

### 8. Storage buckets (Low)

The only bucket, `Images`, is public. That suits product photos. It has no file-size or file-type limit. There are no upload policies, so only the dashboard or the service-role key can upload; nothing in it is private by design.

**Fix:** keep it public, but limit it to 5 MB of JPEG, PNG or WebP.

### 9. SECURITY DEFINER functions (Low)

- **`handle_new_reloop_user()`:** the sign-up trigger. It has `search_path ''` and always creates shop owners as `pending`. `anon` and `authenticated` can execute it, but Postgres refuses to run a trigger function outside a trigger, so it can't be abused. **Fix:** revoke execute anyway.
- **`is_admin()`:** returns only whether the caller is an admin. Its `search_path` is `public` rather than `''`, but every name in it is fully qualified. **Fix:** in block 4e it gets `search_path ''` and also counts hub staff admins. The repo and live versions had drifted: the repo checked `staff`, live checked `admin_users`.

### 10. Internal notes visible to shop owners (Low)

The owners' SELECT policies return every column of their own submissions, including `internal_notes`.

**Fix:** column-level SELECT without `internal_notes`.

### 11. Hub tables missing live (functional, not security)

Confirmed: `items`, `item_events`, `item_photos`, `item_counters`, `staff`, `partners`, `institutions`, `repair_jobs`, `consignments`, `handovers` and `submissions` don't exist live. The hub (`/hub`) still keeps its data in each browser.

**Fix:** block 1 creates them with their RLS, which is needed for Stage E.

## How the check itself ran

The read-only script's `PGOPTIONS` guard was ignored by the Supabase session pooler, so those sessions weren't actually read-only. Every statement was a `SELECT` or `pg_dump`, so nothing changed. Next time, set read-only inside the session.

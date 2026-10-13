# Live database check, 2026-10-13

Results of the read-only script, run by the team against the live Supabase project on 2026-10-13. The schema dump from the same run is `backend/supabase/live-schema-2026-10-13.sql`. The analysis is in [security-report-2026-10-14.md](security-report-2026-10-14.md).

- **No secrets or personal data.** Both files were checked: no keys, tokens, connection strings, password hashes, emails or phone numbers. The server IP is left out.
- **The read-only guard did not apply.** The script set `PGOPTIONS='-c default_transaction_read_only=on'`, but the Supabase session pooler doesn't pass startup options on, and query 0 reported `read_only = off`. Every statement run was a `SELECT` or `pg_dump`, so nothing was written. For a future check, run `SET default_transaction_read_only = on;` inside the session itself, or use the direct connection.

## Server

| Item              | Value                     |
| ----------------- | ------------------------- |
| Postgres version  | 17.11                     |
| Region            | AWS `ap-south-1` (Mumbai) |
| Read-only session | Off (see above)           |

## Users (`auth.users`)

| Email confirmed | Not confirmed |
| --------------- | ------------- |
| 3               | 1             |

## Tables in `public`, RLS and row counts

All ten tables have RLS on; none forces it on the table owner.

| Table                     | RLS | Rows |
| ------------------------- | --- | ---- |
| `admin_users`             | on  | 0    |
| `categories`              | on  | 9    |
| `enquiries`               | on  | 0    |
| `institution_submissions` | on  | 0    |
| `listings`                | on  | 5    |
| `orders`                  | on  | 0    |
| `processing_records`      | on  | 0    |
| `profiles`                | on  | 3    |
| `shop_owners`             | on  | 2    |
| `shop_submissions`        | on  | 1    |

**The hub tables are missing.** None of the repo's hub tables exist live: `items`, `item_events`, `item_photos`, `item_counters`, `staff`, `partners`, `institutions`, `repair_jobs`, `consignments`, `handovers`, `submissions`.

## Policies

| Table                     | Policy                                            | Command | Roles               | Condition                                                           |
| ------------------------- | ------------------------------------------------- | ------- | ------------------- | ------------------------------------------------------------------- |
| `admin_users`             | Admins can manage admin users                     | ALL     | authenticated       | `is_admin()`                                                        |
| `admin_users`             | Admins can view admin users                       | SELECT  | authenticated       | `is_admin() or id = auth.uid()`                                     |
| `categories`              | Admins can manage categories                      | ALL     | authenticated       | `is_admin()`                                                        |
| `categories`              | Public can view categories                        | SELECT  | anon, authenticated | `true`                                                              |
| `enquiries`               | Admins can update enquiries                       | UPDATE  | authenticated       | `is_admin()`                                                        |
| `enquiries`               | Admins can view enquiries                         | SELECT  | authenticated       | `is_admin()`                                                        |
| `enquiries`               | Anyone can create enquiries                       | INSERT  | anon, authenticated | check `true`                                                        |
| `listings`                | Admins can create / delete / update listings      | each    | authenticated       | an active `admin_users` row for `auth.uid()`                        |
| `listings`                | Only admins can create / delete / update listings | each    | authenticated       | `is_admin()` (duplicates the three above)                           |
| `listings`                | Public can view active listings                   | SELECT  | anon, authenticated | `status = 'Active'`                                                 |
| `orders`                  | Admins can update orders                          | UPDATE  | authenticated       | `is_admin()`                                                        |
| `orders`                  | Admins can view orders                            | SELECT  | authenticated       | `is_admin()`                                                        |
| `orders`                  | Anyone can create orders                          | INSERT  | anon, authenticated | check `true`                                                        |
| `processing_records`      | Admins manage processing records                  | ALL     | authenticated       | `is_admin()`                                                        |
| `profiles`                | Users read own profile                            | SELECT  | authenticated       | `user_id = auth.uid()`                                              |
| `profiles`                | Users update own basic profile                    | UPDATE  | authenticated       | `user_id = auth.uid()`                                              |
| `shop_owners`             | Admins can manage shop owners                     | ALL     | authenticated       | `is_admin()`                                                        |
| `shop_owners`             | Owners read own shop profile                      | SELECT  | authenticated       | `id = auth.uid()`                                                   |
| `shop_owners`             | Shop owners can view own profile                  | SELECT  | authenticated       | `id = auth.uid() or is_admin()`                                     |
| `shop_submissions`        | Admins can delete submissions                     | DELETE  | authenticated       | `is_admin()`                                                        |
| `shop_submissions`        | Admins can update submissions                     | UPDATE  | authenticated       | `is_admin()`                                                        |
| `shop_submissions`        | Shop owners can submit items                      | INSERT  | authenticated       | check `shop_owner_id = auth.uid()`                                  |
| `shop_submissions`        | Shop owners read / view own submissions           | SELECT  | authenticated       | `shop_owner_id = auth.uid()` (two policies, one also allows admins) |
| `institution_submissions` | none                                              |         |                     | Nobody can use it through the API.                                  |
| `storage.objects`         | none                                              |         |                     | Nobody can upload through the API.                                  |

## Grants

- **Table level:** `anon` and `authenticated` have every privilege (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER) on every public table. These are Supabase's defaults, so RLS is the only thing protecting rows.
- **The exception:** on `profiles`, `authenticated` has UPDATE only on `full_name` and `phone`, set by migration 20261011000001.
- **Column level:** `anon` and `authenticated` can INSERT and UPDATE every column of `shop_owners`, including `verification_status`. No policy lets them use that, as the security report explains.

## Functions in `public`

| Function                   | SECURITY DEFINER | anon can execute | authenticated can execute | Notes                                             |
| -------------------------- | ---------------- | ---------------- | ------------------------- | ------------------------------------------------- |
| `handle_new_reloop_user()` | yes              | yes              | yes                       | Sign-up trigger on `auth.users`; `search_path ''` |
| `is_admin()`               | yes              | yes              | yes                       | Active `admin_users` row; `search_path public`    |
| `update_updated_at()`      | no               | yes              | yes                       | `updated_at` triggers                             |

Only one trigger sits on `auth.users`: `on_auth_user_created_reloop_profile`, which runs `handle_new_reloop_user()` after each insert.

## Storage buckets

| Bucket   | Public | Size limit | Allowed types |
| -------- | ------ | ---------- | ------------- |
| `Images` | yes    | none       | any           |

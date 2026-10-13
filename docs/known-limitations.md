# Known limitations

What ReLoop does not do yet, or does only partly, as of 2026-10-13. These are deliberate trade-offs for a pilot that opens in November 2026, not hidden bugs. Each has a reason and the fix we'd make. Section 1 lists what must be done before launch.

## 1. Before launch

| Item                          | Now                                                                                                                                                                                          | To launch                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| "Early preview" labels        | Shown in the header and footer, because the hub isn't open                                                                                                                                   | Remove when the hub opens and real stock is listed                                     |
| Privacy policy and terms      | Marked "working draft"                                                                                                                                                                       | Legal review, then remove the draft labels                                             |
| Sample listings               | The shop shows 5 listings marked "Sample · not for sale" that can't be reserved                                                                                                              | Replace with real graded stock, then deactivate the samples                            |
| Hub address                   | An area ("old-city market belt"), drawn approximately on the map                                                                                                                             | Exact address once the room is rented                                                  |
| Pickup route                  | Stops and times "planned from November 2026"                                                                                                                                                 | Confirm with the first partner shops                                                   |
| Partner drop-off shops        | None listed yet                                                                                                                                                                              | Add shops to `frontend/src/config/locations.ts` only after each one agrees to be shown |
| Legal name and postal address | Not set (`SITE.legalName`, `SITE.address`)                                                                                                                                                   | Fill in once the business is registered                                                |
| Compliance                    | ReLoop holds no JKPCC consent and no CPCB refurbisher registration (Phase 2 of the plan, from month 6). The site says so and only claims to use an authorised recycler (VRG Groups, Gangyal) | Apply as planned, then update the site's wording                                       |

## 2. Accounts and email

- **Email confirmation is off.** `mailer_autoconfirm` is `true`, so anyone can register with an email address they don't own.
  - It stays off until a working email sender is set up, because otherwise new users couldn't confirm.
  - Every current account is confirmed, so switching it on locks no one out.
- **No custom email sender (SMTP) yet.** Supabase's built-in mailer delivers only to the project team's own addresses, with a very low hourly limit.
  - So password-reset and resend-confirmation emails (`/forgot-password`, `/resend-confirmation`) won't reach ordinary users yet.
  - Fix: Gmail SMTP in Supabase → Authentication → Emails: host `smtp.gmail.com`, port 465, the shared ReLoop Gmail with an app password, sender name "ReLoop Jammu".
- **Login sessions live in the browser** (`localStorage`), not in secure HTTP-only cookies. A script injected into the page could read them.
  - Sessions are refreshed automatically shortly before the hourly access token expires. If the refresh fails, the user is logged out.
  - Fix: cookie-based sessions via server routes. The earlier, reverted commit `39f28da` shows the shape.
- **One shared admin account.** The team shares one admin login, so you can't tell who verified a shop. Fix: one admin account per person (`supabase-fixes/make-admin.sql`).
- **GSTIN is checked for format only** (15 letters or numbers), not against the government's GST database. A person still reviews every shop on `/hub/shops`.
- **Shop owners aren't notified** when they're verified or rejected; they see the status on `/account`.

## 3. Security and abuse

- **No rate limiting** on shop submissions or the QR scan counter (`/go/drive`). Supabase limits sign-ups and auth emails itself, but the site adds nothing on top.
  - QR counts can be inflated by anyone who visits the link repeatedly. Crawlers and link previews are filtered by user agent only.
  - Fix: a per-IP limit at the edge (Vercel Firewall), or in the route.
- **Preview deployments use the production database and keys.** Any branch preview reads and writes live data. Fix: a separate Supabase project for Preview.
- **Photo links on shop submissions** are typed-in URLs (HTTPS only), not uploads, so they can point anywhere.
- **The 2026-10-14 security fix is applied** and re-checked. `supabase-fixes/2026-10-14-checks.sql` and `supabase-fixes/live-checks-extra.sql` show 17 of 17 true.

## 4. Testing

- **The e2e tests need a separate test database.** None exists, so the browser tests run only locally or in CI with no Supabase at all.
  - The shop then uses the sample stock file (`frontend/src/data/shop-snapshot.json`), and the submissions API is stubbed.
  - They never run against a preview or production.
- **The database tests use PGlite plus a small Supabase stand-in** (`backend/tests/supabase-shim.sql`), not real Supabase. Supabase's own services (Auth, Storage, the API layer) aren't exercised. Live behaviour was checked by hand after each change, with test data removed afterwards.

## 5. Data and operations

- **No point-in-time recovery:** the Supabase Free Plan has none.
  - Backups are manual: `scripts/backup-live-data.sh`, data only, saved to `~/ReLoop-backups`.
  - The restore command in `docs/runbooks/apply-fix-2026-10-14.md` has never been tried on live data.
- **Storage files can't be deleted with SQL** (Supabase blocks it). The old screenshot is unlinked from its listing, but the file is still in the `Images` bucket until someone deletes it in the dashboard.
- **The QR code depends on `https://re-loop-ochre.vercel.app/go/drive`.** That domain must stay assigned to the Vercel project, or printed codes stop working.
- **The map** uses OpenStreetMap tiles, so a visitor's browser contacts OpenStreetMap's servers. All locations are approximate.
- **Server functions run in Mumbai** (`bom1`), next to the database (`ap-south-1`). There's no other performance tuning.

## 6. Staff hub

The hub (`/hub`) now runs on the shared Supabase database, behind a staff login. The previous, device-only hub is used only in local development and CI.

- **Who can use it:** hub staff and admins. Today that's only the shared ReLoop admin account. Add staff with a row in `public.staff`, or admins with `supabase-fixes/make-admin.sql`.
- **Tags:** RL-JMU numbers come from the database. The first real item gets `RL-JMU-0006`, because 0001–0005 are taken by the sample listings.
- **Stock rules:** the day-45 price cut (20%) and day-75 downgrade to C run every day at 06:00 IST (`pg_cron`, `supabase-fixes/2026-10-18-stock-rules-cron.sql`). The dashboard's button runs them too. Each happens once per item, however often the rules run; tests run them repeatedly to prove it.
- **What visitors see:** only shop-facing item columns, and only for listed items. Buy price, supplier, payment, faults, rack and other staff-only fields are never readable by visitors or buyers. `supabase-fixes/live-checks-extra.sql` checks this.
- **Item photos are public by link.** They're stored in the public `item-photos` bucket, so anyone with a photo's exact address can open it, even before the item is listed. The addresses aren't listed anywhere public. Fix: a private bucket with signed links for unlisted items.
- **CSV exports** (dashboard): items and monthly KPIs, for hub staff only. They exclude supplier contact names and phone numbers, and household sellers' names.
- **Device data:** items saved in a browser before the move can be copied to the shared database from `/hub/data`, but only items a person ticks and confirms as real. Copied items get new tags; the old tag is noted in their history.
- **Not built yet:**
  - repair-partner fee tracking beyond the repair log;
  - label or barcode printing;
  - offline use;
  - more than one hub;
  - automatic Instagram posts for price cuts.
- **The public "Sell to us" forms** still hand off to WhatsApp or email. They don't write to the database.

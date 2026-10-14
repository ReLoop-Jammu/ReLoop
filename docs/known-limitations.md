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
- **No email sending, by decision** (no SMTP). So:
  - **Password recovery is admin-only.** `/forgot-password` asks people to message ReLoop. An admin confirms it's them by calling the phone number on their account, then resets the password on `/hub/users`.
  - The temporary password is shown once, and stays valid until the person changes it, with no time limit. Until then, `is_admin()` and `is_staff()` are false and the site sends them to `/account/change-password`.
  - Each reset is logged in `admin_audit_log` (who, whom, when; never the password).
  - `/resend-confirmation` is no longer linked anywhere. It and the self-service reset code are kept for when email sending is set up.
  - Nobody gets email or phone notifications. Updates on requests, offers, verification and deletion requests appear only on the site (the bell and `/account/notifications`, kept 90 days), so people see them only when they visit. WhatsApp stays the channel for anything urgent.
- **Login sessions live in the browser** (`localStorage`), not in secure HTTP-only cookies. A script injected into the page could read them.
  - Sessions are refreshed automatically shortly before the hourly access token expires. If the refresh fails, the user is logged out.
  - Fix: cookie-based sessions via server routes. The earlier, reverted commit `39f28da` shows the shape.
- **One shared admin account.** The team still shares one admin login, so the audit log can't tell people apart. Fix: give each person their own account on `/hub/team` (ReLoop always keeps at least one admin).
- **GSTIN is checked for format only** (15 letters or numbers), not against the government's GST database. A person still reviews every shop on `/hub/shops`.
- **Shop owners accept offers by WhatsApp** for now (accepting in the app comes with offers and pickups). They get an on-site notification when they're verified, rejected or sent an offer.
- **Requests sent while logged out can't be linked to an account later.** Only their private status link shows their stage; deleting an account can't reach them (they're deleted 12 months after closing).

## 3. Security and abuse

- **No rate limiting** on shop submissions, public requests (`/api/requests`: honeypot field and length limits only) or the QR scan counter (`/go/drive`). Supabase limits sign-ups itself, but the site adds nothing on top.
  - QR counts can be inflated by anyone who visits the link repeatedly. Crawlers and link previews are filtered by user agent only.
  - Fix: a per-IP limit at the edge (Vercel Firewall), or in the route.
- **Preview deployments use the simulation database** (since v1.0.0), never production: see `docs/runbooks/simulation.md`. GitHub Actions can't hold the simulation's secret key (adding repository secrets needs admin rights), so CI's browser tests still run with no database, and the journey tests run against the demo site.
- **Photo links on shop submissions** are typed-in URLs (HTTPS only), not uploads, so they can point anywhere.
- **The 2026-10-14 security fix is applied** and re-checked. `supabase-fixes/2026-10-14-checks.sql` and `supabase-fixes/live-checks-extra.sql` show 43 of 43 true (end of round 4, 2026-10-14). The extra checks prove that visitors and buyers can't read other people's contact details, requests or shop data.

- **`npm audit` reports 5 "high" advisories, all one chain:** `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` (GHSA-vfj7-8cjw-p6xm, a denial-of-service in glob parsing). No fixed `braces` release exists; npm's suggested fix is a downgrade to `eslint-config-next` 14. It runs only when linting and is never shipped to the site. `source-map-js` was fixed with an `overrides` entry (1.2.2).
- **GitHub Pages is still switched on** for this repository and serves its files at `reloop-jammu.github.io/ReLoop`. Only a repo admin can turn it off (GitHub → Settings → Pages → Unpublish). Until then the root `index.html` redirects to the live site.

## 4. The loop (submissions, requests, map, team)

- **Offers:** a shop accepts an offer by WhatsApp, not in the app. Staff then press "Create hub items" (one item per unit, linked to the submission).
- **Reservations** don't hold an item by themselves, and nothing expires. Staff mark the item reserved or sold from `/hub/requests`.
- **Deleting requests** is automatic: the daily `reloop-request-retention` job (22:00 UTC, 03:30 IST) deletes a request 12 months after it was closed (sold, cancelled or done), with its contact details. Open requests are kept until staff close them, so an inbox nobody tidies keeps its data. Shop submissions, hub items and the audit log are business records and are not deleted.
- **Map consent** is recorded as a date ticked by an admin, not a signed form. Positions default to the shop's market, marked approximate.
- **Unused live tables** (`enquiries`, `orders`, `institution_submissions`) from the hand-made schema are left in place; the site uses `submissions`.

## 5. Testing

- **The e2e tests need a separate test database.** None exists, so the browser tests run only locally or in CI with no Supabase at all.
  - The shop then uses the sample stock file (`frontend/src/data/shop-snapshot.json`), and the submissions API is stubbed.
  - They never run against a preview or production.
- **The database tests use PGlite plus a small Supabase stand-in** (`backend/tests/supabase-shim.sql`), not real Supabase. Supabase's own services (Auth, Storage, the API layer) aren't exercised. Live behaviour was checked by hand after each change, with test data removed afterwards.

## 6. Data and operations

- **No point-in-time recovery:** the Supabase Free Plan has none.
  - Backups are manual: `scripts/backup-live-data.sh`, data only, saved to `~/ReLoop-backups`.
  - The restore command in `docs/runbooks/apply-fix-2026-10-14.md` has never been tried on live data.
- **Storage files can't be deleted with SQL** (Supabase blocks it). The old screenshot is unlinked from its listing, but the file is still in the `Images` bucket until someone deletes it in the dashboard.
- **The QR code depends on `https://re-loop-ochre.vercel.app/go/drive`.** That domain must stay assigned to the Vercel project, or printed codes stop working.
- **The map** uses OpenStreetMap tiles, so a visitor's browser contacts OpenStreetMap's servers. All locations are approximate.
- **Server functions run in Mumbai** (`bom1`), next to the database (`ap-south-1`).
- **Speed (Lighthouse, mobile, 2026-10-14):** 87–96 performance on a local production build, with 100 accessibility and best practices on six pages. On production, home scores 93 and `/locations` 91–92, or 78 on a cold first load (map tiles come from OpenStreetMap).

## 7. Staff hub

The hub (`/hub`) now runs on the shared Supabase database, behind a staff login. The previous, device-only hub is used only in local development and CI.

- **Who can use it:** hub staff and admins, managed on `/hub/team`. Today that's only the shared ReLoop admin account.
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
- **The public forms** save to the database first: institution bookings, reservations and questions through `/api/requests`, and shop submissions through `/api/shop-submissions`. Then they hand off to WhatsApp or email.

## 8. Outreach and reporting (round 4)

- **Tracked links** (`/go/ig-bio`, `/go/ig-post`, `/go/ig-story`, `/go/wa`, `/go/drive`) are counted in `link_visits` and shown to admins on `/hub/links`, per day or week, with a CSV. Vercel Analytics receives the UTM tags, but the free Hobby plan can't break visits down by them (that needs Web Analytics Plus). See `docs/report/tracked-links.md`.
- **The impact counter** on the home page reads the `impact_totals` view. "Active partner shops" counts hub partners marked active, not verified website accounts.
- **What we don't take** (large appliances, non-electronics, leaking batteries except at the hub) is a team policy choice; the business plan doesn't list exclusions.
- **Hindi** on `/help` and in `docs/report/shop-owner-guide.md` hasn't been checked by a native speaker yet. The printables are English-only until it has.
- **Printables** (`/print`): regenerate the PDFs with `npm run build -w frontend && npm run print -w frontend` after editing the sheet pages. The flyer uses national figures only; no official Jammu figure exists for those years.

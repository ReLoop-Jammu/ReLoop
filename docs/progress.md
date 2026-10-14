# Progress

Updated at the end of every task. Status is one of: done, in progress or not started.

| Stage                                          | Status      | Date       | Note                                                                                                                   |
| ---------------------------------------------- | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| A. Health check                                | done        | 2026-10-13 | `docs/health-check-2026-10-13.md`; the live-database results are in `docs/live-check-2026-10-13.md`.                   |
| B. Analytics                                   | done        | 2026-10-13 | `VERCEL_ANALYTICS=on` and `NEXT_PUBLIC_SITE_URL` set for Production; redeployed; the script loads live.                |
| PR #15 (`chore/prod-health`)                   | done        | 2026-10-13 | All checks green. The local branch was deleted after confirming nothing was left out of `main`.                        |
| Read-only script                               | done        | 2026-10-13 | Run by you. Results in `docs/live-check-2026-10-13.md`; schema dump committed.                                         |
| C. Database baseline and fixes                 | done        | 2026-10-13 | Baseline, fix script with checks, make-admin and backup scripts, and the runbook, all tested.                          |
| Merge PR #15                                   | done        | 2026-10-13 | Squash-merged as `c74134e`, before the fix (safe per the compatibility check). Production functions now run in `bom1`. |
| Apply fix script                               | done        | 2026-10-13 | Backup taken; fix applied; checks 13 of 13; 1 admin set; 16 of 16 live tests; test data cleaned up.                    |
| D. Map page and QR code                        | not started | 2026-10-13 |                                                                                                                        |
| Tidy the admin account                         | done        | 2026-10-13 | Placeholder shop row deleted; tidy script run: "ReLoop Admin", role `admin`, email confirmed.                          |
| E. Hub on Supabase, staff login, KPI dashboard | not started | 2026-10-13 | The hub tables now exist live, empty; the hub app still stores data in each browser.                                   |

## v1.0.0 (approved 2026-10-14)

The plan file is the reference; every question uses its default. Keychain entries `reloop-live-db` and `reloop-supabase-token` were added at the start and are deleted at the end.

| Batch | Branch                            | Status      | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | --------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00    | `chore/v1-baseline`               | done        | PR #41. Node 24; `source-map-js` fixed; Lighthouse and crawl baseline in `docs/report/quality-baseline.md`. GitHub Pages needs repo admin rights to unpublish; root `index.html` redirects to the live site.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 01    | `fix/security-baseline`           | done        | PR #42. Migration `20261026000001` live (backup first); checks 13 + 30 + 6 true; live test 7/7 with a temporary account (deleted). Review found and fixed a dot-segment open redirect in `safeNext`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 02    | `feat/simulation`                 | done        | PR #43. Supabase `reloop-sim` (own free org) seeded; demo at `https://re-loop-demo-beige.vercel.app` (Git-connected; `re-loop-demo.vercel.app` belongs to someone else). Preview of `re-loop` uses the simulation only. Sim journeys 10/10 on the demo.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 03    | `feat/design-foundation`          | done        | PR #44. Business-plan palette and fonts as tokens (all text AA); shared primitives; `docs/design-system.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 04    | `feat/navigation`                 | done        | Grouped header (Buy, Sell, Transparency, About) from 1024 px with an account menu (role, Hub link for staff); mobile menu with the same tree; full-sitemap footer; Report a problem; top bar aligned; one nav config drives header, footer and sitemap.xml.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 05    | `feat/settings`                   | done        | app_settings + set_setting() (admin-only, typed allow-list, logged) + public_settings view, live and in simulation (migrations 20261027000001-2). /hub/settings for contact, drop-off shops, accept lists, categories and numbers; the site reads them on the server, falls back to config without a database, and a save drops the cache (/api/admin/settings/refresh). Fixed: my_access 404 (missing JSON type), header not updating after same-tab login, QR preload warning, clearing a text setting. Open: the demo and preview hold a masked simulation secret key, so their admin routes fail until it is replaced.                                                                    |
| 06    | `feat/roles-and-hub-home`         | done        | HUB_TOOLS drives the hub menu (admin screens hidden from staff, badges from hub_badges()), account cards and the new /hub overview (queues, stock alerts, day-45/75 due this week). KPIs moved to /hub/kpis; new /hub/links (visits per day/week, CSV; link_visit_series), /hub/audit (admin_audit_entries), /hub/search. Login lands by role (next first, staff to /hub, others back where they were); logout notice; blocked pages offer a way back; shop-owner status screens. Migration 20261028000001, live check 9.                                                                                                                                                                     |
| 07    | `feat/accounts-and-requests`      | done        | Requests linked to signed-in buyers, private /status/<token> pages (stage only), buyers cancel their own, staff cancel with a reason the buyer sees, institution bookings scheduled/collected/done. On-site notifications with a header bell. Profile and shop edits (new name or GSTIN back to pending). Account deletion: user asks, admin approves on /hub/deletions, purchase records kept as Deleted account. Retention: notifications 90 days, handled deletion requests 12 months (one daily job). Migration 20261029000001, live checks 10-12. Demo logins can't be renamed or deleted. Open: demo/preview service key still masked, so requests can't be saved there until replaced. |
| 08    | `feat/offers-pickups-payouts`     | done        | Shop owners accept or decline offers in the app (respond_to_offer); accepting books the next Tuesday/Friday route day. pickups table (shop lots and booked institution pickups), missed pickups roll to the next route day with a notification. payouts with numbered receipts RL-PAY-YYYY-NNNN (cash/UPI; reference and note staff-only), receipt PDF from /api/payouts/<receipt> (pdf-lib + qrcode, caller's token, not a tax invoice). Hub: accepted group, record-payment form, overview to-dos. Help guide (EN/HI) and staff guide updated. Migration 20261030000001, live check 13.                                                                                                     |
| 09    | `feat/listing-controls`           | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 10    | `feat/warranty-claims`            | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 11    | `feat/reloop-checked`             | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 12    | `feat/item-passport`              | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 13    | `feat/public-pricing`             | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 14    | `feat/shop-discovery`             | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 15    | `feat/watchlist`                  | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 16    | `feat/impact-network`             | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 17    | `feat/redesign-core`              | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 18    | `feat/redesign-pages-and-wording` | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 19    | `feat/hub-redesign`               | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 20    | `feat/route-and-repairs`          | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 21    | `feat/capacity-batteries-records` | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 22    | `feat/staff-pricing`              | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 23    | `feat/partners`                   | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 24    | `feat/transparency`               | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 25    | `feat/standards-pages`            | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 26    | `chore/quality-gates`             | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 27    | `release/v1.0.0`                  | not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Round 4 (approved 2026-10-13): retention, outreach, guides and report

**All seven batches are done (2026-10-14).** Live checks 43 of 43 true; no test data left; the Keychain entry is deleted. Defaults were used for every question.

- **Left for the team:**
  - have a native speaker check the Hindi on `/help` (then regenerate the guide);
  - put the tracked links in the Instagram bio, posts and stories, and share `/go/wa` on WhatsApp;
  - print the poster and flyer from `/print`;
  - the earlier open items in `docs/known-limitations.md`.

| Batch | Branch                | Status | Note                                                                                                                                                                  |
| ----- | --------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `feat/retention`      | done   | Migration `20261023000001` and the daily job applied live. Checks 39 of 39 true. Live test 5/5 (rolled back).                                                         |
| 2     | `feat/tracked-links`  | done   | PR #35. Migration `20261024000001` live; checks 41/41. Live: 5 links counted once each, previews not counted; Vercel receives the UTM page view; test clicks removed. |
| 3     | `feat/what-we-accept` | done   | `/what-we-accept` (header, sell pages, `/locations`); WhatsApp buttons on item pages (not samples) and sell pages. Header nav inline from 1280 px.                    |
| 4     | `feat/impact-counter` | done   | View `impact_totals` (`20261025000001`) live; checks 43/43. Home shows "Pilot starts November 2026" until a total is above zero. Live test rolled back.               |
| 5     | `feat/print`          | done   | PR #38. A4 poster and flyer, PDFs in `frontend/public/print/` (`npm run print -w frontend`), index `/print`. Live: both PDFs served.                                  |
| 6     | `feat/help`           | done   | `/help` (English and Hindi toggle) and `docs/report/shop-owner-guide.md`, both from `guide.json`. Hindi still to be checked by a native speaker.                      |
| 7     | `docs/report`         | done   | `docs/report/staff-guide.md` and `platform-section.md`; CLAUDE.md and known limitations updated. Final checks 43 of 43 true; Keychain entry deleted.                  |

## Round 3 (approved 2026-10-13): close the loop

**All six batches are done (2026-10-14).** Live checks are 37 of 37 true, the next tag is `RL-JMU-0006`, and 1 admin.

- **Left for the team:**
  - give each person their own account on `/hub/team`;
  - ~~delete closed requests by hand after 12 months~~ (automatic since round 4);
  - the earlier open items in `docs/known-limitations.md`.
- **New real account:** a shop owner (Gmail, verified) registered on 2026-10-13 at 22:46 IST. It was left untouched.

The plan file is the reference. Email sending is off by decision, so password recovery is admin-only.

| Batch | Branch                      | Status | Note                                                                                                                       |
| ----- | --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| A     | `feat/admin-password-reset` | done   | PR #27 (`99f6749`). Live test 11/11: reset, forced change, flag cleared, audit row without password.                       |
| B     | `feat/close-the-loop`       | done   | PR #28 plus fix #29 (`18df5bc`). Live test 18/18 after the fix. Test data removed; counter at 5.                           |
| C     | `feat/partner-map`          | done   | PR #30 (`b7628d2`). Live test 5/5 via the public view; test shop removed.                                                  |
| D     | `feat/team`                 | done   | PR #31 (`cd9f098`). Live test 6/6; audit rows logged; test accounts removed; 1 admin.                                      |
| E     | `chore/quality`             | done   | PR #32 (`c4d935e`). Local 87–96 performance, 100 accessibility and best practices; production home 93, `/locations` 91–92. |
| F     | `docs/round3`               | done   | Limitations, CLAUDE.md and progress updated; privacy wording on request retention; Keychain entry deleted.                 |

## Remaining-work plan (approved 2026-10-13)

Run order: 0 → A → B → C → E+F → G → D, then update G after D. The full plan is in the approved plan file; this table is the resume point.

| Batch | Branch                   | Status | Note                                                                                                        |
| ----- | ------------------------ | ------ | ----------------------------------------------------------------------------------------------------------- |
| 0     | `chore/batch0-cleanup`   | done   | PR #18 merged (`f212377`); live: shop shows samples labelled "not for sale", all pages 200.                 |
| A     | `feat/admin-verify`      | done   | PR #19 merged (`ba7f2e8`); live: `/hub/shops` asks visitors to log in.                                      |
| B     | `feat/account-recovery`  | done   | PR #20 merged (`10981a7`). Auth redirect URLs set by the team; **Gmail SMTP still to set up**.              |
| C     | `feat/locations`         | done   | PR #21 merged (`0a12c71`); live: map, QR page, `/go/drive` redirects and counts (tested, test row removed). |
| E+F   | `feat/launch-content`    | done   | PR #22 merged (`4924557`); live: contact names Harsh Raj; monitors no longer "ship across India".           |
| G     | `docs/known-limitations` | done   | PR #23 merged (`bfc0eb4`); updated again in Batch D.                                                        |
| D     | `feat/hub-supabase`      | done   | PR #25 merged (`4558089`); live end-to-end test passed (11/11), test data removed, counter reset to 5.      |

All batches are done (2026-10-13). PR #24 was closed unmerged: it was opened from an already-merged branch, and was replaced by #25.

### Left for the team

1. **Gmail SMTP** (Batch B pause: the redirect URLs are set, SMTP isn't yet). Until it's set, reset and confirmation emails reach only team addresses.
2. **The old screenshot:** delete it in Supabase → Storage → Images.
3. **Email confirmation:** switch it on once SMTP works. Every current account is confirmed, so no one gets locked out.
4. **Try the hub yourself:** log in at `/hub` with the shared admin account and log a real item. The first real item will get `RL-JMU-0006`.
5. **Accounts per person:** give each team member their own staff or admin account instead of the shared one.
6. **Before launch:** a separate Preview database, and legal review of the privacy and terms pages. See `docs/known-limitations.md`.

### Batch D live changes (2026-10-13)

- Backup `~/ReLoop-backups/backup-2026-10-13-204118.sql`.
- Migration `20261018000001` applied; daily `pg_cron` job `reloop-stock-rules` active (06:00 IST).
- **Live test** with a temporary staff account (`example.com` address), 11 of 11 passed:
  - staff check and rules run;
  - intake created `RL-JMU-0006`;
  - photo upload, photo row and note;
  - read back the item;
  - visitors couldn't see the unlisted item, buy prices or supplier phones.
- **Removed afterwards:** the test item, its photo file, history, staff row and account. The counter was reset to 5, confirmed by query (next tag `RL-JMU-0006`). Checks are 24 of 24 true.

### Batch 0 live changes (2026-10-13)

- Backup `~/ReLoop-backups/backup-2026-10-13-190406.sql`.
- Migration `20261016000001` (`listings.is_sample`) applied live.
- **Accounts:**
  - deleted the admin account's placeholder "tyc" shop row;
  - ran `tidy-admin-account.sql`: the account is now "ReLoop Admin", role `admin`, email confirmed;
  - created Harsh Raj's missing profile (buyer);
  - deleted the teammate's test "Raj Electronics" shop and its one submission, and set that account to buyer.
- **Listings:** the 5 listings were retitled "Sample – …", marked `is_sample`, given an honest description and their correct categories, and their screenshot photo was unlinked.
- **Checks:** 13 of 13 true. 0 shops and 0 submissions remain.
- **Still for you:** delete the unused screenshot in Supabase → Storage → Images.

## Fix applied (2026-10-13)

The full execution record is at the top of `docs/runbooks/apply-fix-2026-10-14.md`.

- **Backup:** `~/ReLoop-backups/backup-2026-10-13-162145.sql`, 12,429 bytes, 12 tables, outside git.
- **Checks:** 13 of 13 true, both inside the fix and in a separate read-only run.
- **Live tests:** 16 of 16 passed:
  - the shop pages work;
  - visitors can't read cost or notes columns, and can't create orders or enquiries;
  - sign-up without a GSTIN works and stays pending;
  - the submission route refuses unverified shops and saves "Broken" as `Damaged` for verified ones;
  - buyer sign-up works.
- **Cleanup:** 0 test users, profiles, shops or submissions remain.

## Live data review (2026-10-13)

- **Backup first:** `~/ReLoop-backups/backup-2026-10-13-173452.sql`.
- **Deleted:** 1 TEST buyer account (keyboard-mash name, no shop, submissions, orders or files), with its profile and login identity.
- **Kept, waiting for the team:**
  - one account with no profile, from before the sign-up trigger existed;
  - the "Raj Electronics" shop (verified, all-digit GSTIN) and its one submission;
  - the admin account's verified "tyc" shop row;
  - the 5 "DEMO" listings and the screenshot image they use. Deleting them would empty the shop.
- **Kept as real:** the 9 categories and the shared ReLoop admin account.
- **Placeholder content on the public pages** (not fixed yet):
  - the 5 "DEMO - …" listings, whose description is "Demo listing for testing", one with a screenshot as its photo;
  - every listing shows "Accessory", because none has a category set;
  - the contact page's phone, hours and grievance officer are "to be published before launch", and the hub address is general;
  - the privacy and terms pages are marked as working drafts.

## Still open

- **Email confirmation is off.** Set up a custom SMTP sender in Supabase, then switch on "Confirm email".
- **Preview deployments share the production database.** e2e tests need a separate test database.
- **The admin account** is the group's shared ReLoop account (confirmed by the team). Still to do: the sign-in test, then the tidy-up. It's still registered as a shop owner, its email isn't confirmed, and its display name is a leftover test value.
- **Leftover shop row:** the tidy script deletes it if it is still pending with no submissions; otherwise it stops.
- PR #16 (post-fix docs) was merged on 2026-10-13 as `7ea9e5e`.

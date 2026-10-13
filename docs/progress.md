# Progress

Updated at the end of every task. Status is one of: done, in progress or not started.

| Stage                                          | Status      | Date       | Note                                                                                                                                                                          |
| ---------------------------------------------- | ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Health check                                | done        | 2026-10-13 | `docs/health-check-2026-10-13.md`; the live-database results are in `docs/live-check-2026-10-13.md`.                                                                          |
| B. Analytics                                   | done        | 2026-10-13 | `VERCEL_ANALYTICS=on` and `NEXT_PUBLIC_SITE_URL` set for Production; redeployed; the script loads live.                                                                       |
| PR #15 (`chore/prod-health`)                   | done        | 2026-10-13 | All checks green. The local branch was deleted after confirming nothing was left out of `main`.                                                                               |
| Read-only script                               | done        | 2026-10-13 | Run by you. Results in `docs/live-check-2026-10-13.md`; schema dump committed.                                                                                                |
| C. Database baseline and fixes                 | done        | 2026-10-13 | Baseline, fix script with checks, make-admin and backup scripts, and the runbook, all tested.                                                                                 |
| Merge PR #15                                   | done        | 2026-10-13 | Squash-merged as `c74134e`, before the fix (safe per the compatibility check). Production functions now run in `bom1`.                                                        |
| Apply fix script                               | done        | 2026-10-13 | Backup taken; fix applied; checks 13 of 13; 1 admin set; 16 of 16 live tests; test data cleaned up.                                                                           |
| D. Map page and QR code                        | not started | 2026-10-13 |                                                                                                                                                                               |
| Tidy the admin account                         | in progress | 2026-10-13 | `admin` role (migration `20261015000001`) and `supabase-fixes/tidy-admin-account.sql` written and tested on `feat/admin-role`; waiting for the connection string to run them. |
| E. Hub on Supabase, staff login, KPI dashboard | not started | 2026-10-13 | The hub tables now exist live, empty; the hub app still stores data in each browser.                                                                                          |

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

## Still open

- **Email confirmation is off.** Set up a custom SMTP sender in Supabase, then switch on "Confirm email".
- **Preview deployments share the production database.** e2e tests need a separate test database.
- **The admin account** is the group's shared ReLoop account (confirmed by the team). Still to do: the sign-in test, then the tidy-up. It's still registered as a shop owner, its email isn't confirmed, and its display name is a leftover test value.
- **Leftover shop row:** the tidy script deletes it if it is still pending with no submissions; otherwise it stops.
- PR #16 (post-fix docs) was merged on 2026-10-13 as `7ea9e5e`.

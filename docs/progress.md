# Progress

Updated at the end of every task. Status is one of: done, in progress or not started.

| Stage                                          | Status      | Date       | Note                                                                                                                     |
| ---------------------------------------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| A. Health check                                | done        | 2026-10-13 | `docs/health-check-2026-10-13.md`; the live-database results are in `docs/live-check-2026-10-13.md`.                     |
| B. Analytics                                   | done        | 2026-10-13 | `VERCEL_ANALYTICS=on` and `NEXT_PUBLIC_SITE_URL` set for Production; redeployed; the script loads live.                  |
| PR #15 (`chore/prod-health`)                   | in progress | 2026-10-14 | Committed locally, waiting for you to push. Locally everything passes, including all 86 browser tests the CI way.        |
| Read-only script                               | done        | 2026-10-13 | Run by you. Results saved to `docs/live-check-2026-10-13.md`; schema dump committed; no secrets or personal data.        |
| C. Database baseline and fixes                 | done        | 2026-10-14 | Baseline, fix script with checks, make-admin and backup scripts, and the runbook, all tested. Nothing has been run live. |
| Apply fix script                               | not started | 2026-10-14 | Follow `docs/runbooks/apply-fix-2026-10-14.md`: back up, run the fix, check it, make the admin.                          |
| Merge PR #15                                   | not started | 2026-10-14 | **After** the fix script has run (runbook step 29), once CI is green.                                                    |
| D. Map page and QR code                        | not started | 2026-10-14 |                                                                                                                          |
| E. Hub on Supabase, staff login, KPI dashboard | not started | 2026-10-14 | The hub tables arrive with the fix script; the hub still stores data in each browser.                                    |

## Stage C items (2026-10-14)

- [x] **Baseline migration** `20261010000001_live_baseline.sql`. It is guarded and changes nothing live; a test proves re-running it changes nothing.
- [x] **CI build without Supabase variables, only when `CI=true` and not on Vercel.** CI uses the sample stock file. A build without `CI` still fails with "Supabase environment variables are missing".
- [x] **Security report** `docs/security-report-2026-10-14.md`: 1 High, 4 Medium and 5 Low findings, plus the missing hub tables.
- [x] **`supabase-fixes/2026-10-14.sql`**, written and **not run**.
  - It is one transaction, safe to run twice, and ends with read-only checks; it refuses to commit if any check fails.
  - Every storage bucket is limited to 5 MB of JPEG, PNG or WebP.
- [x] **`supabase-fixes/make-admin.sql`**: one placeholder email; fails clearly if no account uses it.
- [x] **`scripts/backup-live-data.sh`**: a data-only backup of `public`, `auth.users` and `auth.identities` to `~/ReLoop-backups`, which the script refuses to write into if it is inside git.
- [x] **Runbook** `docs/runbooks/apply-fix-2026-10-14.md`.
- [x] **Server functions set to `bom1`** in `frontend/vercel.json`. Takes effect on the next deploy.
- [x] **`CLAUDE.md` updated.**

## Tests (2026-10-14)

- `npm run check` passes: Prettier, lint, typecheck, 39 unit tests and 50 backend tests.
- The CI build passes, and so do all 86 browser tests with `CI=true` (desktop and mobile).
- The 10 stale browser tests were fixed:
  - tests for the removed `/sell/consignment` and `/sell/list-yourself` pages were deleted;
  - the `/sell/shops` tests now cover the log-in prompt, a signed-in multi-item submission, and the "must be verified" refusal;
  - the hub's ambiguous "Name" field is now labelled "Seller name".
- `backend/tests/live.test.mjs` replays every query the site makes, as the right database role, on the live schema before and after the fix.

## Notes

- **A bug on `main`:** shop submissions with any condition except "Working" are rejected by the database. Fixed on this branch by `frontend/src/features/sell/conditions.ts`.
- **The read-only guard didn't hold** in the 2026-10-13 check. The Supabase pooler ignored `PGOPTIONS`, so those sessions weren't forced read-only. Only `SELECT` and `pg_dump` ran, so nothing changed.
- **Still open:** email confirmation is off, and needs a custom SMTP sender first. Preview deployments share the production database.

# Progress

Updated at the end of every task. Status is one of: done, in progress or not started.

| Stage                                          | Status      | Date       | Note                                                                                                                |
| ---------------------------------------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| A. Health check                                | done        | 2026-10-13 | `docs/health-check-2026-10-13.md`; the live-database results are in `docs/live-check-2026-10-13.md`.                |
| B. Analytics                                   | done        | 2026-10-13 | `VERCEL_ANALYTICS=on` and `NEXT_PUBLIC_SITE_URL` set for Production; redeployed; the script loads live.             |
| PR #15 (`chore/prod-health`)                   | in progress | 2026-10-14 | Stage C pushed. Lint, types, unit and backend tests and the CI build pass; 10 stale browser tests from `main` fail. |
| Read-only script                               | done        | 2026-10-13 | Run by you. Results saved to `docs/live-check-2026-10-13.md`; schema dump committed; no secrets or personal data.   |
| C. Database baseline and fixes                 | done        | 2026-10-14 | All six items below are done. The fix script is written and tested in PGlite, not run.                              |
| Merge PR #15                                   | not started | 2026-10-14 | Waits for your review, and ideally for the stale browser tests to be updated.                                       |
| Apply fix script                               | not started | 2026-10-14 | `supabase-fixes/2026-10-14.sql`: you review it, back up, then run it in the Supabase SQL editor.                    |
| D. Map page and QR code                        | not started | 2026-10-14 |                                                                                                                     |
| E. Hub on Supabase, staff login, KPI dashboard | not started | 2026-10-14 | The hub tables arrive with the fix script; the hub still stores data in each browser.                               |

## Stage C items (2026-10-14)

- [x] **Baseline migration** `20261010000001_live_baseline.sql`. It is guarded and changes nothing live; a test proves re-running it changes nothing. The backend tests pass: 34 of 34, up from 0 of 16.
- [x] **CI build without Supabase variables, only when `CI=true` and not on Vercel.** CI uses the sample stock file. A build without `CI` still fails with "Supabase environment variables are missing".
- [x] **Security report** `docs/security-report-2026-10-14.md`: 1 High, 4 Medium and 5 Low findings, plus the missing hub tables.
- [x] **`supabase-fixes/2026-10-14.sql`** written and **not run**. It is one transaction and safe to run twice. Tested on a live-shaped copy, where it ends with the same schema as the repo.
- [x] **Server functions set to `bom1`** in `frontend/vercel.json`. Takes effect on the next deploy.
- [x] **`CLAUDE.md` updated** with the findings, the region and the test-database note.

## Notes

- **Order matters for GSTIN.** The "Not GST-registered" option only works once the fix script has run. Until then, the live sign-up trigger still requires a GSTIN, and a shop owner who ticks the box gets an error. Run the fix script before or right after merging PR #15.
- **The read-only guard didn't hold.** The Supabase pooler ignored `PGOPTIONS`, so the script's sessions weren't forced read-only. Only `SELECT` and `pg_dump` ran, so nothing changed.
- **Stale browser tests (from `main`):** they still expect `/sell/consignment` and `/sell/list-yourself`, the old `/sell/shops` form, and a single "Name" field in hub intake.

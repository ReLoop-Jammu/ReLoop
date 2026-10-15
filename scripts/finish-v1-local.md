# Finishing v1.0.0 from a local session

The cloud session built v1.0.0 as code on the branch `release/v1`: every database change is a migration in `backend/supabase/migrations/` with PGlite tests, and `npm run check` plus `CI=true npm run test:e2e` are green. It had no secrets, no database and no Vercel access, so the steps below are left for a local session on the Mac that holds the Keychain entries. Run them **in this order**, stop at the first failure, and never print a secret.

Conventions used below:

```sh
cd ~/ReLoop                       # the repo
export PSQL=/opt/homebrew/opt/libpq/bin/psql
live()  { $PSQL "$(security find-generic-password -s reloop-live-db -w)" -v ON_ERROR_STOP=1 "$@"; }
sim()   { $PSQL "postgresql://postgres:$(security find-generic-password -s reloop-sim-db-password -w)@db.fskpgbbsvcwhqogjkezj.supabase.co:5432/postgres" -v ON_ERROR_STOP=1 "$@"; }
```

(If the simulation host is unreachable over IPv4, use the session pooler address from the simulation project's dashboard, or the Supabase SQL editor.)

## 0. Get the code

```sh
git fetch origin release/v1 main
git checkout release/v1 && git pull origin release/v1
npm ci
npm run check
CI=true npm run test:e2e
```

Both must pass before anything touches a database.

## 1. Back up production

```sh
scripts/backup-live-data.sh          # writes ~/ReLoop-backups/<timestamp>.sql
```

Check the file is there and not empty. Repeat this backup before step 4 if more than a day passes.

## 2. Read-only production queries (decisions 15, 16, 17, 20, 34)

Run these and keep the counts for the final report. They change nothing.

```sh
live -c "select category, count(*) from public.items where category::text in ('tv','printer','ups','small_appliance') group by 1;"
live -c "select count(*) as household_items from public.items where source_type::text = 'household';"
live -c "select kind, count(*) from public.submissions where kind::text in ('household_dropoff','consignment') group by 1;"
live -c "select count(*) as shipped from public.items where fulfilment::text = 'ship_india';"
live -c "select key, value from public.app_settings where key in ('hub.address','dropoff.shops');"
live -c "select count(*) filter (where category = 'part' and listed_at < now() - interval '30 days' and price_cut_at is null) as parts_past_day_30, count(*) filter (where category <> 'part' and grade in ('A','B') and listed_at < now() - interval '45 days') as devices_past_day_45 from public.items where status::text = 'listed';"
```

Old rows keep their values (the triggers only block new ones); items already past a threshold get the grace period in `stock.grace_until`.

## 3. Fill in the local-only values

These are the business plan's figures. They never go into a file in the repo.

1. Copy `backend/sim/local-inputs.example.json` to `backend/sim/local-inputs.json` (gitignored) and set, from the private plan:
   - `buy_share_of_resale` (A and B), `c_device_buy_rupees`, `tested_part_buy_rupees` per part type;
   - `vrrg_rates_paise` (VRRG Group's per-kg rate per bin);
   - `finance_benchmarks_paise`: `finance.device_unit_paise`, `finance.scrap_spread_paise_per_kg`.
2. Check `git status` shows no change to tracked files.

## 4. Apply the pending migrations: simulation first, then production

Pending on both projects (in this order):

```
20261106000001_v2_scope_and_places.sql
20261106000002_v2_part_types.sql
20261106000003_v2_scrap_and_partners.sql
20261106000004_v2_source_type.sql
20261106000005_v2_parts_exchange.sql
20261106000006_v2_stock_rules_and_kpis.sql
20261107000001_impact_network.sql
20261107000002_route_and_repairs.sql
20261107000003_capacity_batteries_records.sql
20261107000004_staff_pricing.sql
20261107000005_partners.sql
20261107000006_transparency.sql
20261107000007_wipe_stats.sql
```

Files `…02` and `…04` only add enum values: each must run in its own transaction, before the file that uses the value.

```sh
for f in backend/supabase/migrations/2026110[67]*.sql; do echo "== $f"; sim --single-transaction -f "$f" || break; done
```

Then the read-only checks on the simulation (every row must be `t`):

```sh
for f in 2026-10-14-checks live-checks-extra live-checks-v1 live-checks-v2 live-checks-v3; do sim -f supabase-fixes/$f.sql; done
```

Expect 13 + 30 + 19 + 11 + 8 = 81 checks, all true. Then production, the same way:

```sh
scripts/backup-live-data.sh
for f in backend/supabase/migrations/2026110[67]*.sql; do echo "== $f"; live --single-transaction -f "$f" || break; done
for f in 2026-10-14-checks live-checks-extra live-checks-v1 live-checks-v2 live-checks-v3; do live -f supabase-fixes/$f.sql; done
```

If a file fails on production, stop: nothing in that file was applied (single transaction). Restore nothing; fix the cause, then re-run from that file. The `reloop-stock-rules` and retention cron jobs are unchanged; check they are still scheduled: `live -c "select jobname, schedule from cron.job;"`.

## 5. Re-seed the simulation

```sh
SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s reloop-supabase-token -w) node backend/sim/seed.mjs --apply
```

It reads `backend/sim/local-inputs.json` when present. Re-run the simulation checks from step 4.

## 6. Staff settings in production (admin, on `/hub/settings`)

- `finance.device_unit_paise`, `finance.scrap_spread_paise_per_kg`, `finance.parts_target_monthly_paise`, `finance.fixed_costs_monthly_paise`, `finance.setup_costs_paise` and `vrg.rates_paise`: from the private plan. Staff-only by rule (check 21).
- `ownership.required_from`, `wipe.strip_required_from`, `stock.grace_until`: the launch dates (empty until then, so nothing is enforced early).
- `capacity.device_rack_slots`: once the hub lead has counted the slots.
- `route.markets`: the route's markets with their weekday and start date.
- Review the `buyer_areas` list (about a dozen JMC localities plus "Collected at the hub").

## 7. Environment variables

No new environment variables in v1.0.0. Confirm on Vercel that Production still has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (production project), Preview and `re-loop-demo` the simulation ones, and that `frontend/vercel.json` pins `bom1`. The domain `re-loop-ochre.vercel.app` must stay on the project (printed QR codes).

## 8. Check the simulation build before production

```sh
npm run test:sim -w frontend                                       # the demo
SIM_BASE_URL=http://localhost:3200 npm run test:sim -w frontend    # a local simulation build
```

Then by hand on the demo: `/impact`, `/network`, `/ledger`, `/reports` (one month, its PDF and CSV), `/data`, `/partners`, the hub's route, repairs, capacity (rack slots shown as the simulated 120), pricing (flags, CSV with no supplier columns), lots (handover record PDF: tags and VRRG receipt, no prices, no "certificate" or "disposal").

## 9. Merge `release/v1` into `main`

```sh
git checkout main && git pull origin main
git merge --no-ff release/v1 -m "release: v1.0.0"
git push origin main                 # this deploys production through Vercel
```

Wait for the Vercel production deployment to finish.

## 10. Live checks after the deploy

- Re-run the five check files on production (step 4): all 81 true.
- Open `/`, `/shop`, an item, `/sell/shops`, `/rate-card`, `/impact`, `/network`, `/ledger`, `/partners`, `/standards`, `/compliance`, `/about` on `https://re-loop-ochre.vercel.app`. Pages with no data yet must say the pilot is starting, never show invented numbers.
- `https://re-loop-ochre.vercel.app/go/drive`, `/go/rate-card` and `/go/partner-badge` redirect.
- Sign in as staff: `/hub` loads, the today panel and capacity load.
- With a temporary buyer account only, check that `/shop` shows no buy price or margin; delete the account afterwards and confirm with a count.
- Lighthouse (mobile) on home, shop, item, sell, locations, impact, network, help and hub; record the scores in `docs/report/quality-baseline.md` next to the baseline.
- Screenshots of about 16 main pages at 390 and 1280 px on production and the demo into `docs/report/screenshots/` (JPEG, at most 200 KB each, no personal data).

If anything is wrong, `vercel rollback` and fix on a branch.

## 11. Tag v1.0.0 and the GitHub release

```sh
git tag -a v1.0.0 -m "ReLoop v1.0.0: Business Plan v2 for the Jammu pilot"
git push origin v1.0.0
gh release create v1.0.0 --title "ReLoop v1.0.0" --notes-file CHANGELOG.md
```

## 12. Clean up

- Final backup: `scripts/backup-live-data.sh`.
- Delete the merged branches (`release/v1` stays until the release is confirmed; then delete it and the `feat/…` branches, `autosave/cloud` and `claude-wip` on the remote).
- **Delete the Keychain entries**, even if an earlier step failed:

```sh
security delete-generic-password -s reloop-live-db
security delete-generic-password -s reloop-supabase-token
security delete-generic-password -s reloop-sim-db-password
```

(`reloop-sim-service` holds the demo's simulation key; keep it only if the demo still needs to be rebuilt from this Mac.)

- Fill in the open items of the final report (`docs/report/v1-final-report.md`): the counts from step 2, the Lighthouse table, the screenshots, and anything that failed.

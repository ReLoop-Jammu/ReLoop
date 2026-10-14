# Simulation environment

A separate copy of ReLoop that holds only generated data, so the demo, preview deployments and journey tests never touch production.

| Part      | What it is                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| Database  | Supabase project `reloop-sim` (ref `fskpgbbsvcwhqogjkezj`), its own free organisation, separate from the production project |
| Demo site | Vercel project `re-loop-demo`, `https://re-loop-demo-beige.vercel.app`, built from `main`                                   |
| Previews  | Every preview deployment of the main `re-loop` project uses the simulation database (Preview variables), never production   |
| Marker    | `NEXT_PUBLIC_RELOOP_ENV=simulation`: a banner on every page, `noindex` everywhere, and no WhatsApp or email handoffs        |
| Guard     | A build fails if the simulation flag and the production database are mixed up (`frontend/src/lib/environment.ts`)           |

## The data

`backend/sim/seed.mjs` generates six simulated months ending on the day it runs, from the business plan's assumptions:

- intake ramps 60 → 110 → 160 → 200 → 240 → 280 items a month;
- sources: repair shops 50%, retailers 21%, institutions 21%, households 7%;
- grades A 15%, B 25%, C 30%, D 30%; B items go to repair partners (most come back fixed), C items are stripped into tagged parts, D items and shells go to the scrap cage;
- buy prices from the grade rules (A ~45% and B ~25% of the expected resale price, C ₹100–200, D free); about 80% of listed A/B items sell; the day-45 price cut applies;
- recycler handovers when the cage reaches 100 kg or 14 days pass;
- reservations, questions, institution pickups, shop submissions with offers, and daily short-link clicks;
- 25 fictional partner shops, 3 fictional institutions, dummy phone numbers.

Every name is fictional. The demo logins are listed on the simulation site's `/demo` page (one per role, one shared password).

## Re-seed

Resets the simulation to six fresh months ending today. It refuses any project but the simulation one, and the SQL refuses a database holding real accounts.

```sh
export SUPABASE_ACCESS_TOKEN=…   # a personal access token from supabase.com (the simulation's account)
node backend/sim/seed.mjs --apply
```

`--sql=out.sql` writes the SQL without running it; `--today=YYYY-MM-DD` picks the end date.

## Schema changes

Every migration is applied to the simulation project first, then to production. Apply one through the Supabase dashboard's SQL editor, or with the Management API `database/query` endpoint.

## Journey tests

```sh
npm run test:sim -w frontend                       # against https://re-loop-demo-beige.vercel.app
SIM_BASE_URL=http://localhost:3200 npm run test:sim -w frontend
```

These run against the simulation only. The main browser tests (`npm run test:e2e`) still run in CI with no database at all.

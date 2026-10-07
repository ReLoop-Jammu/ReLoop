# ReLoop backend

The database for the ReLoop hub, managed as code. It follows the Business Plan (ADR 0004): ReLoop buys items, tags each one `RL-JMU-0001`, grades it A–D at the hub, and resells, repairs, strips or recycles it.

```
backend/
├─ supabase/
│  ├─ config.toml                          # Supabase CLI settings (local dev)
│  ├─ migrations/
│  │  ├─ …_hub_inventory.sql               # tables, rules, triggers, Row Level Security
│  │  └─ …_item_photos_storage.sql         # photo bucket (public read, staff write)
│  └─ seed.sql                             # local only: a hub admin + the 12 sample items
└─ tests/                                  # runs the real migrations in PGlite; checks every rule
```

## Tables

| Table                         | Holds                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `staff`                       | Hub staff accounts (`staff` / `admin`). Only staff can use the hub.                                                  |
| `partners`, `institutions`    | Who we collect from (shops on the Tue/Fri route, colleges and offices).                                              |
| `items`                       | Every tagged item: source, category, grade, test checklist, data wipe, buy price, list/current price, status, dates. |
| `item_events`                 | Automatic history of every grade, status and price change.                                                           |
| `item_photos`                 | Photo paths in the `item-photos` storage bucket.                                                                     |
| `repair_jobs`, `consignments` | B-grade repairs by partner shops; consignment deals (> ₹10,000, 70% to seller).                                      |
| `handovers`                   | Recycler pickups: kg by category, batteries, items included, receipt number, amount.                                 |
| `submissions`                 | Public "Sell to us" and reservation requests.                                                                        |

## Rules the database enforces (not just the UI)

- **Tags** are assigned by the database (`item_counters`), so they never collide, even with several devices.
- **Nothing goes on sale** without a grade of A, B or C, a price and a listing date. Grade C sells only as parts, and phones, laptops, desktops and drives must be **wiped first**.
- **Unsold stock:** `apply_stock_rules()` cuts the price 20% at day 45 (once) and downgrades whole devices to C at day 75. It can be run only by the server and is scheduled daily with pg_cron.
- A **handover** automatically moves its scrap-cage items to `handed_over`.
- **Visitors** read only items on sale, and only public columns: never buy prices, sources or notes. They can send requests but cannot read them.
- **Staff** manage everything. Only **admins** add staff.

## Testing

```sh
npm test -w backend
```

Runs on [PGlite](https://pglite.dev) (Postgres in WebAssembly), so no Docker is needed. `tests/supabase-shim.sql` stands in for Supabase's `auth` and `storage` schemas.

## Connecting a real Supabase project

1. The teammate creates the project (region: Mumbai). See `docs/team-setup.md`.
2. `npx supabase link --workdir backend --project-ref <ref>`
3. `npx supabase db push --workdir backend` applies the migrations.
4. In the Supabase dashboard, enable **pg_cron** and run:
   `select cron.schedule('reloop-stock-rules', '0 1 * * *', 'select public.apply_stock_rules()');`
5. Add the first admin (after they sign up) in the SQL editor:
   `insert into public.staff (user_id, full_name, role) select id, 'Name', 'admin' from auth.users where email = '…';`
6. Then the frontend's data layer (`frontend/src/features/inventory/store`) gets a Supabase adapter, and the hub gets a staff login.

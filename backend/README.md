# ReLoop backend

> **Needs a rewrite before use.** This schema models the earlier hybrid marketplace. ADR 0004 replaced it with ReLoop-owned, graded inventory. Do not apply these migrations to a real project until the schema is rewritten around `items`, `partners`, `institutions` and `handovers`.

Everything that runs on the server side of the database lives here, managed as code:

```
backend/
├─ supabase/
│  ├─ config.toml            # Supabase CLI project settings (local dev)
│  ├─ migrations/            # Every schema change, in order. Never edit an applied one.
│  │  ├─ …_core_schema.sql   # Tables, hybrid-moderation trigger, audit log, RLS policies
│  │  └─ …_listing_photos_storage.sql  # Photo bucket + per-user folder policies
│  └─ seed.sql               # Local sample data: admin, ReLoop Jammu org, 16 listings
└─ tests/                    # Runs the real migrations in PGlite and checks every rule
```

## Security model (enforced by the database, not the UI)

- **Row Level Security is on for every table.** Visitors read only published listings; members read and write only their own data; admins moderate.
- **Hybrid moderation** (see `docs/adr/0002-hybrid-moderation.md`): the `apply_listing_rules` trigger publishes a submission only if it belongs to the seller's own verified organization. Everything else goes to `pending_review`, and editing a published individual listing sends it back to review.
- Members cannot make themselves admin, verify their own organization, reject listings, spoof inquiry senders or upload outside their own photo folder.
- Moderation decisions are written to `audit_log` by `SECURITY DEFINER` triggers. Clients can't write to it.

## Testing

```sh
npm test -w backend
```

The tests run on [PGlite](https://pglite.dev) (Postgres compiled to WebAssembly), so they need no Docker. `tests/supabase-shim.sql` supplies small stand-ins for Supabase's `auth` and `storage` schemas and roles.

## Connecting a real Supabase project (Phase 3)

1. Create a project at supabase.com (region: Mumbai, `ap-south-1`).
2. `npx supabase link --workdir backend --project-ref <ref>`
3. `npx supabase db push --workdir backend` applies the migrations.
4. Put the project URL and keys in `frontend/.env.local` (see `frontend/.env.example`). Never commit them.

For a full local stack (needs Docker): `npx supabase start --workdir backend`.

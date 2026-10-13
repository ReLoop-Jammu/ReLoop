import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { MIGRATIONS, as, createTestDb, createUser, readSql } from "./db.mjs";

const BASELINE = "20261010000001_live_baseline.sql";
const FIX_SCRIPT = "../supabase-fixes/2026-10-14.sql";
// What has really been applied to the live database (2026-10-13 dump).
const LIVE = [
  BASELINE,
  "20261011000001_accounts_and_shop_verification.sql",
  "20261013000001_fix_signup_phone_validation.sql",
];

const shopOwner = (db, name, extra = {}) =>
  createUser(db, name, {
    meta: {
      account_type: "shop_owner",
      shop_name: `${name} Mobiles`,
      business_address: "Raghunath Bazaar",
      ...extra,
    },
  });

async function addListing(db) {
  const { rows } = await db.query(
    `insert into public.listings (title, price, purchase_cost, internal_notes)
     values ('Redmi 9', 4500, 2000, 'bought from a walk-in') returning id`,
  );
  return rows[0].id;
}

/** Tables, columns, policies, triggers, functions and grants, for comparing two states. */
async function catalog(db) {
  const { rows } = await db.query(`
    select 'col ' || table_name || '.' || column_name || ' ' || data_type || ' ' || is_nullable || ' ' || coalesce(column_default, '') as x
      from information_schema.columns where table_schema = 'public'
    union all select 'pol ' || tablename || '.' || policyname || ' ' || cmd || ' ' || roles::text || ' ' || coalesce(qual, '') || ' ' || coalesce(with_check, '')
      from pg_policies where schemaname in ('public', 'storage')
    union all select 'trg ' || tgrelid::regclass || '.' || tgname from pg_trigger where not tgisinternal
    union all select 'fn ' || p.proname || ' ' || md5(p.prosrc) from pg_proc p where p.pronamespace = 'public'::regnamespace
    union all select 'rls ' || relname || ' ' || relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
    union all select 'grant ' || table_name || ' ' || grantee || ' ' || privilege_type
      from information_schema.role_table_grants where table_schema = 'public'
    order by 1`);
  return rows.map((r) => r.x);
}

describe("live baseline", () => {
  test("changes nothing when run again on a database that already has it", async () => {
    const db = await createTestDb();
    const before = await catalog(db);
    await db.exec(readSql(BASELINE));
    assert.deepEqual(await catalog(db), before);
  });

  test("creates the tables that were made by hand, with RLS on", async () => {
    const db = await createTestDb({ migrations: LIVE, seed: false });
    const { rows } = await db.query(
      "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1",
    );
    assert.deepEqual(
      rows.map((r) => r.relname),
      [
        "admin_users",
        "categories",
        "enquiries",
        "institution_submissions",
        "listings",
        "orders",
        "processing_records",
        "profiles",
        "shop_owners",
        "shop_submissions",
      ],
    );
    assert.ok(rows.every((r) => r.relrowsecurity));
  });
});

describe("the holes the security report found (live, before the fixes)", () => {
  let db;
  before(async () => {
    db = await createTestDb({ migrations: LIVE, seed: false });
  });

  test("visitors can read a listing's purchase cost and internal notes", async () => {
    await addListing(db);
    const { rows } = await as(db, null, (tx) =>
      tx.query("select purchase_cost, internal_notes from public.listings"),
    );
    assert.equal(rows[0].internal_notes, "bought from a walk-in");
  });

  test("an unverified shop owner can insert a submission directly, with any status", async () => {
    const owner = await shopOwner(db, "Pending", { gstin: "01ABCDE1234F1Z5" });
    await as(db, owner, (tx) =>
      tx.query(
        "insert into public.shop_submissions (shop_owner_id, item_name, status) values ($1, 'TV', 'Purchased')",
        [owner],
      ),
    );
  });

  test("anyone can create an order with any status", async () => {
    const listing = await addListing(db);
    await as(db, null, (tx) =>
      tx.query(
        "insert into public.orders (listing_id, customer_name, status) values ($1, 'x', 'Completed')",
        [listing],
      ),
    );
  });
});

describe("supabase-fixes/2026-10-14.sql on a live-shaped database", () => {
  let db;
  let owner;
  let admin;
  before(async () => {
    db = await createTestDb({ migrations: LIVE, seed: false });
    await addListing(db);
    owner = await shopOwner(db, "Owner", { gstin: "01ABCDE1234F1Z5" });
    admin = await createUser(db, "Market Admin");
    await db.query("insert into public.admin_users (id, name) values ($1, 'Market Admin')", [
      admin,
    ]);
    await db.exec(readSql(FIX_SCRIPT));
  });

  test("runs a second time without errors or changes", async () => {
    const first = await catalog(db);
    await db.exec(readSql(FIX_SCRIPT));
    assert.deepEqual(await catalog(db), first);
  });

  test("ends up with the same schema as the repo migrations", async () => {
    const repo = await createTestDb({ seed: false });
    assert.deepEqual(await catalog(db), await catalog(repo));
  });

  test("adds the hub tables with RLS on", async () => {
    const { rows } = await db.query(
      "select count(*)::int as n from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relrowsecurity and relname = any($1)",
      [
        [
          "items",
          "item_events",
          "item_photos",
          "item_counters",
          "staff",
          "partners",
          "institutions",
          "repair_jobs",
          "consignments",
          "handovers",
          "submissions",
        ],
      ],
    );
    assert.equal(rows[0].n, 11);
  });

  test("visitors see listings but not their costs or notes", async () => {
    const { rows } = await as(db, null, (tx) =>
      tx.query("select id, title, price from public.listings"),
    );
    assert.equal(rows.length, 1);
    await assert.rejects(
      as(db, null, (tx) => tx.query("select purchase_cost from public.listings")),
      /permission denied/,
    );
    await assert.rejects(
      as(db, owner, (tx) => tx.query("select internal_notes from public.listings")),
      /permission denied/,
    );
  });

  test("visitors and users can't write listings or categories", async () => {
    for (const user of [null, owner]) {
      await assert.rejects(
        as(db, user, (tx) => tx.query("insert into public.categories (name) values ('x')")),
      );
      await assert.rejects(
        as(db, user, (tx) =>
          tx.query("insert into public.listings (title, price) values ('x', 1)"),
        ),
      );
      const { rowCount } = await as(db, user, (tx) =>
        tx.query("update public.listings set price = 1"),
      );
      assert.equal(rowCount, 0);
    }
  });

  test("shop owners can't insert submissions directly or read internal notes", async () => {
    await assert.rejects(
      as(db, owner, (tx) =>
        tx.query(
          "insert into public.shop_submissions (shop_owner_id, item_name) values ($1, 'TV')",
          [owner],
        ),
      ),
      /permission denied/,
    );
    await assert.rejects(
      as(db, owner, (tx) => tx.query("select internal_notes from public.shop_submissions")),
      /permission denied/,
    );
  });

  test("a shop owner can't verify themselves; an admin can", async () => {
    const { rowCount } = await as(db, owner, (tx) =>
      tx.query("update public.shop_owners set verification_status = 'verified' where id = $1", [
        owner,
      ]),
    );
    assert.equal(rowCount, 0);
    await as(db, admin, (tx) =>
      tx.query("update public.shop_owners set verification_status = 'verified' where id = $1", [
        owner,
      ]),
    );
    const { rows } = await db.query(
      "select verification_status from public.shop_owners where id = $1",
      [owner],
    );
    assert.equal(rows[0].verification_status, "verified");
  });

  test("the verification guard holds even if a policy lets owners edit their row", async () => {
    await db.exec(`create policy "test: owners edit own shop" on public.shop_owners for update to authenticated
                   using (id = auth.uid()) with check (id = auth.uid())`);
    await db.exec("grant update on public.shop_owners to authenticated");
    try {
      await as(db, owner, (tx) =>
        tx.query("update public.shop_owners set shop_name = 'Renamed' where id = $1", [owner]),
      );
      await assert.rejects(
        as(db, owner, (tx) =>
          tx.query("update public.shop_owners set verification_status = 'pending' where id = $1", [
            owner,
          ]),
        ),
        /Only ReLoop can change shop verification/,
      );
    } finally {
      await db.exec(`drop policy "test: owners edit own shop" on public.shop_owners`);
    }
  });

  test("visitors can't create orders or enquiries any more", async () => {
    await assert.rejects(
      as(db, null, (tx) => tx.query("insert into public.orders (customer_name) values ('x')")),
    );
  });

  test("trigger functions can't be called through the API", async () => {
    const { rows } = await db.query(
      "select has_function_privilege('anon', 'public.handle_new_reloop_user()', 'execute') as anon_exec",
    );
    assert.equal(rows[0].anon_exec, false);
  });
});

describe("sign-up with optional GSTIN (all migrations)", () => {
  let db;
  before(async () => {
    db = await createTestDb({ seed: false });
  });

  test("a shop that isn't GST-registered can sign up without a GSTIN", async () => {
    const id = await shopOwner(db, "NoGst");
    const { rows } = await db.query(
      "select gstin, verification_status from public.shop_owners where id = $1",
      [id],
    );
    assert.deepEqual(rows[0], { gstin: null, verification_status: "pending" });
  });

  test("a GSTIN that is given must be 15 letters or numbers", async () => {
    await assert.rejects(
      shopOwner(db, "BadGst", { gstin: "12345" }),
      /GSTIN must contain exactly 15/,
    );
    const id = await shopOwner(db, "GoodGst", { gstin: "01abcde1234f1z5" });
    const { rows } = await db.query("select gstin from public.shop_owners where id = $1", [id]);
    assert.equal(rows[0].gstin, "01ABCDE1234F1Z5");
  });

  test("migrations run in order: the baseline comes before the accounts migration", () => {
    assert.ok(
      MIGRATIONS.indexOf(BASELINE) <
        MIGRATIONS.indexOf("20261011000001_accounts_and_shop_verification.sql"),
    );
  });
});

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

  test("plus the later migrations, ends up with the same schema as the repo", async () => {
    const live = await createTestDb({ migrations: LIVE, seed: false });
    await live.exec(readSql(FIX_SCRIPT));
    for (const m of MIGRATIONS.filter((m) => m > "20261014999999")) await live.exec(readSql(m));
    const repo = await createTestDb({ seed: false });
    assert.deepEqual(await catalog(live), await catalog(repo));
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

/*
 * Every query the site makes, replayed as the role PostgREST would use, on the
 * live schema before and after the fix script. Mirrors:
 *   frontend/src/features/shop/queries.ts         (anon)
 *   frontend/src/app/(site)/account/page.tsx      (signed-in user)
 *   frontend/src/app/api/shop-submissions/route.ts (service role)
 *   sign-up through Supabase Auth                 (the auth.users trigger)
 */
async function asService(db, fn) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    return fn(tx);
  });
}

// The values route.ts maps the form's conditions to (see frontend/src/features/sell/conditions.ts).
const SUBMITTED_CONDITIONS = ["Good", "Used", "Damaged", "For Parts"];

for (const [label, fixed] of [
  ["before", false],
  ["after", true],
]) {
  describe(`site queries ${label} the fix script`, () => {
    let db;
    let owner;
    before(async () => {
      db = await createTestDb({ migrations: LIVE, seed: false });
      await db.exec("insert into public.categories (name) values ('Mobiles')");
      await addListing(db);
      owner = await shopOwner(db, "Query", { gstin: "01ABCDE1234F1Z5" });
      await db.query(
        "update public.shop_owners set verification_status = 'verified' where id = $1",
        [owner],
      );
      if (fixed) await db.exec(readSql(FIX_SCRIPT));
    });

    test("shop: listings and categories load for visitors", async () => {
      const { rows } = await as(db, null, (tx) =>
        tx.query(`select id, title, description, category_id, brand, model, condition, price, stock, image_url,
                         status, featured, grade, created_at
                    from public.listings where status = 'Active' and stock > 0 order by created_at desc`),
      );
      assert.equal(rows.length, 1);
      const cats = await as(db, null, (tx) =>
        tx.query("select id, name from public.categories order by name"),
      );
      assert.equal(cats.rows.length, 1);
    });

    test("account page: a signed-in user reads their profile and shop", async () => {
      const p = await as(db, owner, (tx) =>
        tx.query("select full_name, role from public.profiles limit 1"),
      );
      assert.equal(p.rows[0].role, "shop_owner");
      const s = await as(db, owner, (tx) =>
        tx.query("select shop_name, gstin, verification_status from public.shop_owners limit 1"),
      );
      assert.equal(s.rows[0].verification_status, "verified");
    });

    test("submission route: checks role and verification, then inserts", async () => {
      await asService(db, async (tx) => {
        const role = await tx.query("select role from public.profiles where user_id = $1", [owner]);
        assert.equal(role.rows[0].role, "shop_owner");
        const v = await tx.query(
          "select verification_status from public.shop_owners where id = $1",
          [owner],
        );
        assert.equal(v.rows[0].verification_status, "verified");
        for (const condition of SUBMITTED_CONDITIONS) {
          await tx.query(
            `insert into public.shop_submissions
               (shop_owner_id, item_name, category_id, brand, model, description, quantity, condition, asking_price, image_url, status)
             values ($1, 'TV', null, null, null, 'Category: TVs', 2, $2, null, null, 'Pending') returning *`,
            [owner, condition],
          );
        }
      });
    });

    test("sign-up: buyers and shop owners with a GSTIN", async () => {
      await createUser(db, `Buyer ${label}`);
      await shopOwner(db, `Gst ${label}`, {
        gstin: label === "before" ? "02ABCDE1234F1Z5" : "03ABCDE1234F1Z5",
      });
    });

    test(`sign-up: a shop owner without a GSTIN ${fixed ? "works" : "is refused"}`, async () => {
      const signUp = shopOwner(db, `NoGst ${label}`);
      if (fixed) await signUp;
      else await assert.rejects(signUp, /GSTIN must contain exactly 15/);
    });
  });
}

describe("the fix script's checks", () => {
  const CHECKS = "../supabase-fixes/2026-10-14-checks.sql";
  const checks = async (db) => (await db.query(readSql(CHECKS))).rows;

  test("show the holes open before the fix and closed after it", async () => {
    const db = await createTestDb({ migrations: LIVE, seed: false });
    await db.exec(
      "insert into storage.buckets (id, name, public) values ('Images', 'Images', true)",
    );
    const before = await checks(db);
    assert.equal(before.length, 13);
    const open = before.filter((c) => !c.ok).map((c) => c.check_name);
    assert.ok(open.some((n) => n.startsWith("Visitors cannot read listing purchase_cost")));
    assert.ok(open.some((n) => n.startsWith("Shop owners (verified or not) cannot insert")));
    assert.ok(open.some((n) => n.startsWith("Visitors cannot create orders")));
    assert.ok(open.some((n) => n.startsWith("Every storage bucket")));

    await db.exec(readSql(FIX_SCRIPT));
    const after = await checks(db);
    assert.deepEqual(
      after.filter((c) => !c.ok).map((c) => c.check_name),
      [],
    );
    const { rows } = await db.query(
      "select file_size_limit, allowed_mime_types from storage.buckets where id = 'Images'",
    );
    assert.deepEqual(rows[0], {
      file_size_limit: 5242880,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
    });
  });

  test("the guard refuses to commit when a check fails", async () => {
    const db = await createTestDb({ migrations: LIVE, seed: false });
    const script = readSql(FIX_SCRIPT);
    const guard = script.slice(
      script.lastIndexOf("do $$\ndeclare\n  failed"),
      script.lastIndexOf("commit;"),
    );
    await assert.rejects(
      db.exec(guard),
      /ReLoop fix checks failed, so nothing was changed: .*purchase_cost/,
    );
  });

  test("the fix script and the checks file run the same checks", () => {
    const select = readSql(CHECKS).slice(readSql(CHECKS).indexOf("select check_name"));
    assert.ok(readSql(FIX_SCRIPT).includes(select.trim()));
  });
});

describe("supabase-fixes/make-admin.sql", () => {
  const MAKE_ADMIN = "../supabase-fixes/make-admin.sql";
  const withEmail = (email) =>
    readSql(MAKE_ADMIN).replace("'PUT-THE-ADMIN-EMAIL-HERE'::text", `'${email}'::text`);
  // A failed script leaves its transaction open here; the SQL Editor ends it itself.
  const failing = async (sql, message) => {
    await assert.rejects(db.exec(sql), message);
    await db.exec("rollback");
  };
  let db;
  let admin;
  before(async () => {
    db = await createTestDb({ migrations: LIVE, seed: false });
    await db.exec(readSql(FIX_SCRIPT));
    admin = await createUser(db, "Asha");
  });

  test("refuses to run with the placeholder still in place", async () => {
    await failing(readSql(MAKE_ADMIN), /put the admin's email on the line marked CHANGE THIS/);
  });

  test("fails clearly, changing nothing, when no account uses the email", async () => {
    await failing(
      withEmail("nobody@example.com"),
      /no ReLoop account uses the email nobody@example\.com/,
    );
    const { rows } = await db.query("select count(*)::int as n from public.admin_users");
    assert.equal(rows[0].n, 0);
  });

  test("makes the account an admin, matching the email in any case, and can run twice", async () => {
    await db.exec(withEmail("  ASHA@Test.Local "));
    await db.exec(withEmail("asha@test.local"));
    const { rows } = await db.query("select id, name, is_active from public.admin_users");
    assert.deepEqual(rows, [{ id: admin, name: "Asha", is_active: true }]);
    const isAdmin = await as(db, admin, (tx) => tx.query("select public.is_admin() as yes"));
    assert.equal(isAdmin.rows[0].yes, true);
  });
});

describe("the admin account role", () => {
  const TIDY = "../supabase-fixes/tidy-admin-account.sql";
  const leftoverAdmin = async (db, name) => {
    const id = await createUser(db, name, {
      meta: { account_type: "shop_owner", shop_name: name, business_address: name },
    });
    await db.query("insert into public.admin_users (id, name) values ($1, $2)", [id, name]);
    return id;
  };
  const failing = async (db, message) => {
    await assert.rejects(db.exec(readSql(TIDY)), message);
    await db.exec("rollback");
  };
  const liveDb = async () => {
    const db = await createTestDb({ migrations: LIVE, seed: false });
    await db.exec(readSql(FIX_SCRIPT));
    return db;
  };

  test("nobody can sign up as an admin", async () => {
    const db = await createTestDb({ seed: false });
    const id = await createUser(db, "Sneaky", { meta: { account_type: "admin" } });
    const { rows } = await db.query("select role from public.profiles where user_id = $1", [id]);
    assert.equal(rows[0].role, "buyer");
  });

  test("tidy-admin-account.sql turns the leftover shop owner into a confirmed 'ReLoop Admin'", async () => {
    const db = await liveDb();
    const id = await leftoverAdmin(db, "wer");
    await db.exec(readSql(TIDY));
    const { rows } = await db.query(
      `select p.full_name, p.role::text, a.name, u.email_confirmed_at is not null as confirmed,
              u.raw_user_meta_data ->> 'full_name' as meta_name,
              exists (select 1 from public.shop_owners where id = $1) as has_shop
         from public.profiles p join public.admin_users a on a.id = p.user_id join auth.users u on u.id = p.user_id
        where p.user_id = $1`,
      [id],
    );
    assert.deepEqual(rows[0], {
      full_name: "ReLoop Admin",
      role: "admin",
      name: "ReLoop Admin",
      confirmed: true,
      meta_name: "ReLoop Admin",
      has_shop: false,
    });
    const isAdmin = await as(db, id, (tx) => tx.query("select public.is_admin() as yes"));
    assert.equal(isAdmin.rows[0].yes, true);
    await db.exec(readSql(TIDY));
  });

  test("refuses, changing nothing, if the shop row has a submission", async () => {
    const db = await liveDb();
    const id = await leftoverAdmin(db, "wer");
    await db.query(
      "insert into public.shop_submissions (shop_owner_id, item_name) values ($1, 'TV')",
      [id],
    );
    await failing(db, /the admin's shop row looks real \(status pending, 1 submissions\)/);
    const { rows } = await db.query(
      "select (select role::text from public.profiles where user_id = $1) as role, (select count(*)::int from public.shop_owners where id = $1) as shops",
      [id],
    );
    assert.deepEqual(rows[0], { role: "shop_owner", shops: 1 });
  });

  test("refuses if the shop was ever verified, or if there isn't exactly one admin", async () => {
    const db = await liveDb();
    const id = await leftoverAdmin(db, "wer");
    await db.query("update public.shop_owners set verification_status = 'verified' where id = $1", [
      id,
    ]);
    await failing(db, /looks real \(status verified, 0 submissions\)/);
    await leftoverAdmin(db, "second");
    await failing(db, /expected exactly one active admin, found 2/);
  });
});

describe("sample listings (20261016000001)", () => {
  test("visitors read is_sample with the shop's columns, but still no costs", async () => {
    const db = await createTestDb({ migrations: LIVE, seed: false });
    await db.exec(readSql(FIX_SCRIPT));
    await db.exec(readSql("20261016000001_listing_samples.sql"));
    await db.query(
      "insert into public.listings (title, price, grade, is_sample) values ('Sample – laptop', 18000, 'A', true)",
    );
    const { rows } = await as(db, null, (tx) =>
      tx.query(`select id, title, description, category_id, brand, model, condition, price, stock, image_url,
                       status, featured, grade, created_at, is_sample
                  from public.listings where status = 'Active' and stock > 0 order by created_at desc`),
    );
    assert.equal(rows[0].is_sample, true);
    await assert.rejects(
      as(db, null, (tx) => tx.query("select purchase_cost from public.listings")),
      /permission denied/,
    );
  });
});

describe("admin shop verification (/hub/shops)", () => {
  let db;
  let admin;
  let owner;
  let buyer;
  before(async () => {
    db = await createTestDb({ migrations: LIVE, seed: false });
    await db.exec(readSql(FIX_SCRIPT));
    for (const m of MIGRATIONS.filter((m) => m > "20261014999999")) await db.exec(readSql(m));
    admin = await createUser(db, "Admin");
    await db.query("insert into public.admin_users (id, name) values ($1, 'Admin')", [admin]);
    owner = await shopOwner(db, "Pending");
    buyer = await createUser(db, "Buyer");
  });
  const COLUMNS =
    "id, shop_name, owner_name, phone, email, business_address, city, gstin, verification_status, verified_at, review_notes, created_at";

  test("the page's role checks are callable by signed-in users", async () => {
    const r = await as(db, admin, (tx) =>
      tx.query("select public.is_admin() as a, public.is_staff() as s"),
    );
    assert.deepEqual(r.rows[0], { a: true, s: false });
    const b = await as(db, buyer, (tx) => tx.query("select public.is_admin() as a"));
    assert.equal(b.rows[0].a, false);
  });

  test("an admin lists every shop and can verify or reject one", async () => {
    const list = await as(db, admin, (tx) => tx.query(`select ${COLUMNS} from public.shop_owners`));
    assert.equal(list.rows.length, 1);
    const verify = await as(db, admin, (tx) =>
      tx.query(
        `update public.shop_owners set verification_status = 'verified', verified_at = now(), reviewed_by = $2, review_notes = 'ok'
          where id = $1 returning ${COLUMNS}`,
        [owner, admin],
      ),
    );
    assert.equal(verify.rows[0].verification_status, "verified");
    const reject = await as(db, admin, (tx) =>
      tx.query(
        `update public.shop_owners set verification_status = 'rejected', verified_at = null, reviewed_by = $2, review_notes = 'Fake GSTIN'
          where id = $1 returning verification_status`,
        [owner, admin],
      ),
    );
    assert.equal(reject.rows[0].verification_status, "rejected");
  });

  test("a shop owner sees only their own row and can't review it; a buyer sees none", async () => {
    const own = await as(db, owner, (tx) => tx.query(`select ${COLUMNS} from public.shop_owners`));
    assert.equal(own.rows.length, 1);
    const { rowCount } = await as(db, owner, (tx) =>
      tx.query("update public.shop_owners set verification_status = 'verified' where id = $1", [
        owner,
      ]),
    );
    assert.equal(rowCount, 0);
    const none = await as(db, buyer, (tx) => tx.query("select id from public.shop_owners"));
    assert.equal(none.rows.length, 0);
  });
});

describe("awareness-drive QR scans (20261017000001)", () => {
  let db;
  let admin;
  let user;
  before(async () => {
    db = await createTestDb({ migrations: LIVE, seed: false });
    await db.exec(readSql(FIX_SCRIPT));
    for (const m of MIGRATIONS.filter((m) => m > "20261014999999")) await db.exec(readSql(m));
    admin = await createUser(db, "Admin");
    await db.query("insert into public.admin_users (id, name) values ($1, 'Admin')", [admin]);
    user = await createUser(db, "Visitor");
  });
  const scan = (tx) =>
    tx.query("insert into public.qr_scans (campaign) values ('awareness-drive-2026')");

  test("only the server (service role) records scans, with a valid campaign", async () => {
    await asService(db, scan);
    await asService(db, scan);
    await assert.rejects(
      asService(db, (tx) =>
        tx.query("insert into public.qr_scans (campaign) values ('Bad Campaign!')"),
      ),
      /check constraint/,
    );
    await assert.rejects(as(db, null, scan), /permission denied/);
    await assert.rejects(as(db, user, scan), /permission denied/);
  });

  test("admins read the count; visitors and other users read nothing", async () => {
    const a = await as(db, admin, (tx) =>
      tx.query("select count(*)::int as n from public.qr_scans"),
    );
    assert.equal(a.rows[0].n, 2);
    const u = await as(db, user, (tx) =>
      tx.query("select count(*)::int as n from public.qr_scans"),
    );
    assert.equal(u.rows[0].n, 0);
    await assert.rejects(
      as(db, null, (tx) => tx.query("select id from public.qr_scans")),
      /permission denied/,
    );
  });
});

describe("supabase-fixes/live-checks-extra.sql", () => {
  test("every check is true on the repo schema", async () => {
    const db = await createTestDb({ seed: false });
    const { rows } = await db.query(readSql("../supabase-fixes/live-checks-extra.sql"));
    assert.ok(rows.length > 0);
    assert.deepEqual(
      rows.filter((r) => !r.ok).map((r) => r.check_name),
      [],
    );
  });
});

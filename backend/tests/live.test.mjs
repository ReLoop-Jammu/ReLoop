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
    // Admins count as hub staff (20261018000001).
    assert.deepEqual(r.rows[0], { a: true, s: true });
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

describe("staff hub on Supabase (20261018000001)", () => {
  let db;
  let staff;
  let buyer;
  before(async () => {
    db = await createTestDb({ seed: false });
    staff = await createUser(db, "Hub Staff", { staff: true });
    buyer = await createUser(db, "Buyer");
  });

  async function listedItem(
    daysAgo,
    { pricePaise = 100000, category = "laptop", grade = "A", partType = null } = {},
  ) {
    // Valid for sale: wiped (laptops must be) and, for parts, with a part type.
    const { rows } = await db.query(
      `insert into public.items (source_type, category, part_type, buy_mode, grade, current_paise, list_paise,
                                 status, listed_at, wiped_at)
       values ('repair_shop', $1, $5, 'cash', $2, $3, $3, 'listed', now() - make_interval(days => $4), now())
       returning id`,
      [category, grade, pricePaise, daysAgo, partType],
    );
    return rows[0].id;
  }
  const item = async (id) =>
    (
      await db.query(
        "select grade, status, current_paise, price_cut_at from public.items where id = $1",
        [id],
      )
    ).rows[0];
  const runAt = (days) =>
    db.query("select public.apply_stock_rules(now() + make_interval(days => $1))", [days]);

  test("the day-45 cut and the day-75 downgrade each happen once, however often the rules run", async () => {
    const id = await listedItem(0);
    for (let i = 0; i < 3; i++) await runAt(0);
    assert.equal((await item(id)).current_paise, 100000, "nothing before day 45");

    for (let i = 0; i < 3; i++) await runAt(46);
    const cut = await item(id);
    assert.equal(cut.current_paise, 80000, "cut by 20% once");
    for (const d of [50, 60, 74]) await runAt(d);
    assert.equal((await item(id)).current_paise, 80000, "never cut again");

    for (let i = 0; i < 3; i++) await runAt(76);
    const after = await item(id);
    assert.deepEqual([after.grade, after.status], ["C", "stripping"]);
    await runAt(120);
    assert.equal((await item(id)).current_paise, 80000, "a stripped item is left alone");
  });

  test("parts are cut once but not downgraded, and a cheap item never breaks the run", async () => {
    const part = await listedItem(80, {
      category: "part",
      grade: "C",
      pricePaise: 50000,
      partType: "board",
    });
    const cheap = await listedItem(50, { pricePaise: 1000 });
    for (let i = 0; i < 2; i++) await runAt(0);
    assert.deepEqual(
      [(await item(part)).status, (await item(part)).current_paise],
      ["listed", 40000],
    );
    assert.equal((await item(cheap)).current_paise, 1000, "never below Rs 10");
  });

  test("staff run the rules from the dashboard; buyers and visitors can't", async () => {
    const n = await as(db, staff, (tx) => tx.query("select public.run_stock_rules() as n"));
    assert.equal(typeof n.rows[0].n, "number");
    await assert.rejects(
      as(db, buyer, (tx) => tx.query("select public.run_stock_rules()")),
      /Only hub staff/,
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select public.run_stock_rules()")),
      /permission denied/,
    );
    await assert.rejects(
      as(db, staff, (tx) => tx.query("select public.apply_stock_rules()")),
      /permission denied/,
    );
  });

  test("visitors read listed items' shop columns only; buyers read no items", async () => {
    const id = await listedItem(1);
    const shop = await as(db, null, (tx) =>
      tx.query(
        "select id, category, grade, brand, model, current_paise, list_paise, price_cut_at, listed_at from public.items where status = 'listed'",
      ),
    );
    assert.ok(shop.rows.some((r) => r.id === id));
    for (const col of [
      "buy_paise",
      "source_name",
      "source_contact_name",
      "source_phone",
      "purchase_payment_method",
      "faults",
      "created_by",
    ]) {
      await assert.rejects(
        as(db, null, (tx) => tx.query(`select ${col} from public.items`)),
        /permission denied/,
        col,
      );
    }
    const mine = await as(db, buyer, (tx) => tx.query("select id from public.items"));
    assert.equal(mine.rows.length, 0);
    await assert.rejects(
      as(db, null, (tx) => tx.query("select fee_paise from public.repair_jobs")),
      /permission denied/,
    );
  });

  test("the first hub tag comes after the sample listings", async () => {
    const fresh = await createTestDb({ migrations: LIVE, seed: false });
    await fresh.exec(readSql(FIX_SCRIPT));
    for (let i = 0; i < 5; i++)
      await fresh.query("insert into public.listings (title, price) values ('Sample', 1)");
    for (const m of MIGRATIONS.filter((m) => m > "20261014999999")) await fresh.exec(readSql(m));
    const s = await createUser(fresh, "Staff", { staff: true });
    const { rows } = await as(fresh, s, (tx) =>
      tx.query(
        "insert into public.items (source_type, category, buy_mode) values ('household', 'phone', 'cash') returning id",
      ),
    );
    assert.equal(rows[0].id, "RL-JMU-0006");
  });
});

describe("item notes (20261018000001)", () => {
  test("staff can add a note to an item's history; buyers can't", async () => {
    const db = await createTestDb({ seed: false });
    const staff = await createUser(db, "Staff", { staff: true });
    const buyer = await createUser(db, "Buyer");
    const { rows } = await as(db, staff, (tx) =>
      tx.query(
        "insert into public.items (source_type, category, buy_mode) values ('household', 'phone', 'cash') returning id",
      ),
    );
    const id = rows[0].id;
    await as(db, staff, (tx) =>
      tx.query(
        "insert into public.item_events (item_id, type, note) values ($1, 'note', 'Sent for a screen')",
        [id],
      ),
    );
    await assert.rejects(
      as(db, buyer, (tx) =>
        tx.query("insert into public.item_events (item_id, type, note) values ($1, 'note', 'x')", [
          id,
        ]),
      ),
    );
    const history = await as(db, staff, (tx) =>
      tx.query(
        "select type, note, actor = $2 as mine from public.item_events where item_id = $1 order by id",
        [id, staff],
      ),
    );
    assert.deepEqual(
      history.rows.map((r) => r.type),
      ["received", "note"],
    );
    assert.equal(history.rows[1].mine, true);
  });
});

describe("admin password reset (20261019000001)", () => {
  let db;
  let admin;
  let staff;
  before(async () => {
    db = await createTestDb({ seed: false });
    admin = await createUser(db, "Admin");
    await db.query("insert into public.admin_users (id, name) values ($1, 'Admin')", [admin]);
    staff = await createUser(db, "Staff", { staff: true });
  });
  const flag = (id, on) =>
    db.query("update public.profiles set must_change_password = $2 where user_id = $1", [id, on]);
  const roles = async (id) =>
    (await as(db, id, (tx) => tx.query("select public.is_admin() as a, public.is_staff() as s")))
      .rows[0];

  test("users can't clear their own flag", async () => {
    await flag(staff, true);
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query("update public.profiles set must_change_password = false where user_id = $1", [
          staff,
        ]),
      ),
      /permission denied/,
    );
    const { rows } = await as(db, staff, (tx) =>
      tx.query("select must_change_password from public.profiles"),
    );
    assert.equal(rows[0].must_change_password, true, "they can read it");
    await flag(staff, false);
  });

  test("while the flag is set, staff and admins are neither", async () => {
    assert.deepEqual(await roles(admin), { a: true, s: true });
    assert.deepEqual(await roles(staff), { a: false, s: true });
    await flag(admin, true);
    await flag(staff, true);
    assert.deepEqual(await roles(admin), { a: false, s: false });
    assert.deepEqual(await roles(staff), { a: false, s: false });
    const items = await as(db, staff, (tx) =>
      tx.query("select count(*)::int as n from public.partners"),
    );
    assert.equal(items.rows[0].n, 0, "RLS shuts the hub's data");
    await flag(admin, false);
    await flag(staff, false);
    assert.deepEqual(await roles(staff), { a: false, s: true });
  });

  test("only admins read the audit log, nobody signed in writes it, and it has no password column", async () => {
    await asService(db, (tx) =>
      tx.query(
        "insert into public.admin_audit_log (admin_id, target_user_id, action) values ($1, $2, 'password_reset')",
        [admin, staff],
      ),
    );
    const a = await as(db, admin, (tx) => tx.query("select action from public.admin_audit_log"));
    assert.equal(a.rows.length, 1);
    const s = await as(db, staff, (tx) => tx.query("select action from public.admin_audit_log"));
    assert.equal(s.rows.length, 0);
    await assert.rejects(
      as(db, admin, (tx) =>
        tx.query("insert into public.admin_audit_log (action) values ('password_reset')"),
      ),
      /permission denied/,
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select id from public.admin_audit_log")),
      /permission denied/,
    );
    const cols = await db.query(
      "select column_name from information_schema.columns where table_name = 'admin_audit_log'",
    );
    assert.ok(cols.rows.every((c) => !/pass/i.test(c.column_name)));
  });
});

describe("closing the loop (20261020000001)", () => {
  let db;
  let staff;
  let owner;
  let other;
  let submission;
  before(async () => {
    db = await createTestDb({ migrations: LIVE, seed: false });
    await db.exec(readSql(FIX_SCRIPT));
    for (const m of MIGRATIONS.filter((m) => m > "20261014999999")) await db.exec(readSql(m));
    staff = await createUser(db, "Hub Staff", { staff: true });
    owner = await shopOwner(db, "Owner");
    other = await shopOwner(db, "Other");
    await db.query("update public.shop_owners set verification_status = 'verified'");
    const { rows } = await asService(db, (tx) =>
      tx.query(
        `insert into public.shop_submissions (shop_owner_id, item_name, brand, model, quantity, condition, internal_notes)
         values ($1, 'Redmi 9', 'Xiaomi', 'Redmi 9', 2, 'Damaged', 'secret') returning id`,
        [owner],
      ),
    );
    submission = rows[0].id;
  });
  const OWNER_COLS = "id, status, offer_price, offer_note, rejection_reason, reviewed_at";

  test("staff make an offer; the owner sees it, other owners see nothing", async () => {
    await as(db, staff, (tx) =>
      tx.query(
        `update public.shop_submissions set status = 'Offered', offer_price = 450, offer_note = 'Screens cracked',
                reviewed_at = now(), reviewed_by = $2 where id = $1`,
        [submission, staff],
      ),
    );
    const mine = await as(db, owner, (tx) =>
      tx.query(`select ${OWNER_COLS} from public.shop_submissions`),
    );
    assert.deepEqual(
      [mine.rows[0].status, Number(mine.rows[0].offer_price), mine.rows[0].offer_note],
      ["Offered", 450, "Screens cracked"],
    );
    await assert.rejects(
      as(db, owner, (tx) => tx.query("select internal_notes from public.shop_submissions")),
      /permission denied/,
    );
    const theirs = await as(db, other, (tx) =>
      tx.query(`select ${OWNER_COLS} from public.shop_submissions`),
    );
    assert.equal(theirs.rows.length, 0);
    const { rowCount } = await as(db, owner, (tx) =>
      tx.query("update public.shop_submissions set status = 'Purchased' where id = $1", [
        submission,
      ]),
    );
    assert.equal(rowCount, 0, "owners can't change the status");
  });

  test("an offered submission becomes one linked hub item per unit, once", async () => {
    await assert.rejects(
      as(db, owner, (tx) =>
        tx.query("select public.convert_submission($1, 'phone', null, 45000)", [submission]),
      ),
      /Only hub staff/,
    );
    const { rows } = await as(db, staff, (tx) =>
      tx.query("select public.convert_submission($1, 'phone', null, 45000) as tags", [submission]),
    );
    assert.deepEqual(rows[0].tags, ["RL-JMU-0001", "RL-JMU-0002"]);
    const items = await db.query(
      "select source_name, source_contact_name, brand, buy_paise, faults, shop_submission_id from public.items order by id",
    );
    assert.equal(items.rows.length, 2);
    assert.deepEqual(
      [
        items.rows[0].source_name,
        items.rows[0].brand,
        Number(items.rows[0].buy_paise),
        String(items.rows[0].shop_submission_id),
      ],
      ["Owner Mobiles", "Xiaomi", 45000, String(submission)],
    );
    assert.match(items.rows[0].faults, /Condition reported by the shop: Damaged/);
    const sub = await db.query(
      "select status, purchase_price from public.shop_submissions where id = $1",
      [submission],
    );
    assert.deepEqual([sub.rows[0].status, Number(sub.rows[0].purchase_price)], ["Purchased", 900]);
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query("select public.convert_submission($1, 'phone', null, 45000)", [submission]),
      ),
      /Only an offered submission/,
    );
  });

  test("requests: only the server inserts, only staff read, and statuses include sold and cancelled", async () => {
    const { rows } = await db.query("select id from public.items limit 1");
    await asService(db, (tx) =>
      tx.query(
        "insert into public.submissions (kind, fields, item_id) values ('reservation', $1, $2)",
        [{ name: "Asha", phone: "9876543210" }, rows[0].id],
      ),
    );
    await asService(db, (tx) =>
      tx.query(
        "insert into public.submissions (kind, fields) values ('enquiry', '{\"name\":\"B\"}')",
      ),
    );
    for (const user of [null, owner]) {
      await assert.rejects(
        as(db, user, (tx) =>
          tx.query("insert into public.submissions (kind, fields) values ('enquiry', '{}')"),
        ),
        /permission denied/,
      );
    }
    await assert.rejects(
      as(db, null, (tx) => tx.query("select fields from public.submissions")),
      /permission denied/,
    );
    const visible = await as(db, owner, (tx) => tx.query("select fields from public.submissions"));
    assert.equal(
      visible.rows.length,
      0,
      "a signed-in buyer or shop owner sees no one's contact details",
    );
    // Request ids are random uuids, so compare the kinds as a set.
    const inbox = await as(db, staff, (tx) =>
      tx.query("select kind, item_id from public.submissions"),
    );
    assert.deepEqual(inbox.rows.map((r) => r.kind).sort(), ["enquiry", "reservation"]);
    await as(db, staff, (tx) =>
      tx.query(
        "update public.submissions set status = 'sold', handled_at = now() where kind = 'reservation'",
      ),
    );
    await as(db, staff, (tx) =>
      tx.query("update public.submissions set status = 'cancelled' where kind = 'enquiry'"),
    );
  });
});

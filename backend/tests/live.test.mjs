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
      // The page filters by the user's own id (frontend/src/app/(site)/account/page.tsx).
      const p = await as(db, owner, (tx) =>
        tx.query("select full_name, role from public.profiles where user_id = $1", [owner]),
      );
      assert.equal(p.rows[0].role, "shop_owner");
      const s = await as(db, owner, (tx) =>
        tx.query(
          "select shop_name, gstin, verification_status from public.shop_owners where id = $1",
          [owner],
        ),
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
    // Live as it is now: the baseline, the fix script and every later migration.
    db = await createTestDb({ migrations: LIVE, seed: false });
    await db.exec(readSql(FIX_SCRIPT));
    for (const m of MIGRATIONS.filter((m) => m > "20261014999999")) await db.exec(readSql(m));
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
    const label = await db.query("select role::text from public.profiles where user_id = $1", [
      admin,
    ]);
    assert.equal(label.rows[0].role, "admin", "the account page shows 'ReLoop admin'");
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

describe("supabase-fixes/live-checks-v1.sql", () => {
  test("every v1 check is true on the repo schema", async () => {
    const db = await createTestDb();
    const { rows } = await db.query(readSql("../supabase-fixes/live-checks-v1.sql"));
    assert.ok(rows.length >= 5);
    assert.deepEqual(
      rows.filter((r) => !r.ok).map((r) => r.check_name),
      [],
    );
  });
});

describe("supabase-fixes/live-checks-extra.sql", () => {
  test("every check is true on the repo schema", async () => {
    // With the seed, which (like live) has an admin.
    const db = await createTestDb();
    // The daily jobs, as scheduled live (PGlite has no extension to create).
    for (const job of ["2026-10-18-stock-rules-cron.sql", "2026-10-23-request-retention-cron.sql"])
      await db.exec(readSql(`../supabase-fixes/${job}`).replace(/^create extension.*$/m, ""));
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
    // As mustChangePassword() asks: filtered to the user's own row.
    const { rows } = await as(db, staff, (tx) =>
      tx.query("select must_change_password from public.profiles where user_id = $1", [staff]),
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

  test("a staff review must return only the id: the full row includes internal notes", async () => {
    const { rows } = await asService(db, (tx) =>
      tx.query(
        "insert into public.shop_submissions (shop_owner_id, item_name) values ($1, 'Probe') returning id",
        [owner],
      ),
    );
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query("update public.shop_submissions set offer_price = 1 where id = $1 returning *", [
          rows[0].id,
        ]),
      ),
      /permission denied/,
    );
    const ok = await as(db, staff, (tx) =>
      tx.query("update public.shop_submissions set offer_price = 1 where id = $1 returning id", [
        rows[0].id,
      ]),
    );
    assert.equal(ok.rows.length, 1);
    await db.query("delete from public.shop_submissions where id = $1", [rows[0].id]);
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

describe("partner shops on the map (20261021000001)", () => {
  let db;
  let admin;
  let shop;
  before(async () => {
    db = await createTestDb({ migrations: LIVE, seed: false });
    await db.exec(readSql(FIX_SCRIPT));
    for (const m of MIGRATIONS.filter((m) => m > "20261014999999")) await db.exec(readSql(m));
    admin = await createUser(db, "Admin");
    await db.query("insert into public.admin_users (id, name) values ($1, 'Admin')", [admin]);
    shop = await shopOwner(db, "Sharma", { gstin: "01ABCDE1234F1Z5" });
  });
  const publicMap = async () =>
    (await as(db, null, (tx) => tx.query("select * from public.map_partner_shops"))).rows;
  const setMap = (fields) =>
    as(db, admin, (tx) =>
      tx.query(
        `update public.shop_owners set ${Object.keys(fields)
          .map((k, i) => `${k} = $${i + 2}`)
          .join(", ")} where id = $1 returning id`,
        [shop, ...Object.values(fields)],
      ),
    );

  test("a shop can't be shown without a consent date and a position", async () => {
    await assert.rejects(setMap({ show_on_map: true }), /shop_owners_map_needs_consent/);
  });

  test("only verified shops that agreed appear, with name, market and position only", async () => {
    await setMap({
      show_on_map: true,
      map_consent_at: "2026-10-13T10:00:00Z",
      map_market: "Raghunath Bazaar",
      map_lat: 32.7302,
      map_lng: 74.8641,
    });
    assert.deepEqual(await publicMap(), [], "not verified yet");
    await db.query("update public.shop_owners set verification_status = 'verified' where id = $1", [
      shop,
    ]);
    assert.deepEqual(await publicMap(), [
      {
        name: "Sharma Mobiles",
        market: "Raghunath Bazaar",
        lat: 32.7302,
        lng: 74.8641,
        approximate: true,
      },
    ]);
    await setMap({ show_on_map: false });
    assert.deepEqual(await publicMap(), [], "turning it off hides the shop at once");
    await assert.rejects(
      as(db, null, (tx) => tx.query("select phone from public.shop_owners")),
      /permission denied/,
    );
  });

  test("shop owners can't put themselves on the map", async () => {
    const { rowCount } = await as(db, shop, (tx) =>
      tx.query("update public.shop_owners set show_on_map = true where id = $1", [shop]),
    );
    assert.equal(rowCount, 0);
  });
});

describe("team management (20261022000001)", () => {
  let db;
  let admin;
  let user;
  before(async () => {
    db = await createTestDb({ seed: false });
    admin = await createUser(db, "Admin");
    await db.query("insert into public.admin_users (id, name) values ($1, 'Admin')", [admin]);
    user = await createUser(db, "Ravi");
  });
  const setRole = (who, target, staff, adminOn) =>
    as(db, who, (tx) =>
      tx.query("select public.set_account_role($1, $2, $3)", [target, staff, adminOn]),
    );
  const state = async (id) =>
    (
      await db.query(
        `select exists (select 1 from public.staff where user_id = $1) as staff,
                exists (select 1 from public.admin_users where id = $1 and is_active) as admin,
                (select role::text from public.profiles where user_id = $1) as role`,
        [id],
      )
    ).rows[0];

  test("an admin promotes and demotes; the profile label follows; each change is logged", async () => {
    await setRole(admin, user, true, false);
    assert.deepEqual(await state(user), { staff: true, admin: false, role: "buyer" });
    await setRole(admin, user, true, true);
    assert.deepEqual(await state(user), { staff: true, admin: true, role: "admin" });
    await setRole(admin, user, false, false);
    assert.deepEqual(await state(user), { staff: false, admin: false, role: "buyer" });
    const log = await db.query(
      "select detail from public.admin_audit_log where action = 'role_change' order by id",
    );
    assert.deepEqual(
      log.rows.map((r) => r.detail),
      ["staff on, admin off", "staff on, admin on", "staff off, admin off"],
    );
  });

  test("non-admins can't change roles", async () => {
    await assert.rejects(setRole(user, user, true, true), /Only admins/);
    await assert.rejects(
      as(db, null, (tx) => tx.query("select public.set_account_role($1, true, true)", [user])),
      /permission denied/,
    );
  });

  test("ReLoop always keeps at least one admin, however the change is made", async () => {
    await assert.rejects(setRole(admin, admin, false, false), /at least one admin/);
    await assert.rejects(
      db.query("update public.admin_users set is_active = false"),
      /at least one admin/,
    );
    await assert.rejects(db.query("delete from public.admin_users"), /at least one admin/);
    await assert.rejects(
      db.query("delete from auth.users where id = $1", [admin]),
      /at least one admin/,
    );
    await setRole(admin, user, false, true);
    await setRole(admin, admin, false, false);
    assert.deepEqual(
      await state(admin),
      { staff: false, admin: false, role: "buyer" },
      "with another admin, you can step down",
    );
  });
});

describe("request retention (20261023000001)", () => {
  let db;
  let staff;
  before(async () => {
    db = await createTestDb();
    staff = await createUser(db, "Staff", { staff: true });
    const owner = await shopOwner(db, "Ravi");
    await db.query(
      `insert into public.shop_submissions (shop_owner_id, item_name, quantity, condition)
       values ($1, 'Old phones', 2, 'Damaged')`,
      [owner],
    );
    await db.query(
      "insert into public.admin_audit_log (action, detail) values ('role_change', 'keep me')",
    );
  });
  const add = async (label, status, monthsAgo) => {
    const { rows } = await db.query(
      `insert into public.submissions (kind, fields) values ('reservation', $1) returning id`,
      [{ name: label, phone: "9000000000" }],
    );
    // New requests always arrive as "new"; staff then change the status.
    await db.query(
      "update public.submissions set status = $2, created_at = now() - interval '3 years' where id = $1",
      [rows[0].id, status],
    );
    if (monthsAgo !== null) {
      // The trigger sets closed_at to now(); backdate it as if closed long ago.
      await db.exec("alter table public.submissions disable trigger submissions_track_closed");
      await db.query(
        `update public.submissions set closed_at = now() - make_interval(months => $2::int) where id = $1`,
        [rows[0].id, monthsAgo],
      );
      await db.exec("alter table public.submissions enable trigger submissions_track_closed");
    }
    return rows[0].id;
  };
  const names = async () =>
    (await db.query("select fields->>'name' as n from public.submissions order by 1")).rows.map(
      (r) => r.n,
    );

  test("closing sets closed_at once, moving between closed statuses keeps it, reopening clears it", async () => {
    const id = await add("clock", "new", null);
    const at = async () =>
      (await db.query("select closed_at from public.submissions where id = $1", [id])).rows[0]
        .closed_at;
    assert.equal(await at(), null);
    await as(db, staff, (tx) =>
      tx.query("update public.submissions set status = 'done' where id = $1", [id]),
    );
    const first = await at();
    assert.ok(first, "closing starts the clock");
    await as(db, staff, (tx) =>
      tx.query(
        "update public.submissions set status = 'cancelled', closed_at = '2000-01-01' where id = $1",
        [id],
      ),
    );
    assert.deepEqual(await at(), first, "staff can't backdate it, and a second close keeps it");
    await as(db, staff, (tx) =>
      tx.query("update public.submissions set status = 'contacted' where id = $1", [id]),
    );
    assert.equal(await at(), null, "reopening stops the clock");
    await db.query("delete from public.submissions where id = $1", [id]);
  });

  test("deletes only requests closed more than 12 months ago, and nothing else", async () => {
    await db.query("delete from public.submissions");
    await add("closed 13 months ago (sold)", "sold", 13);
    await add("closed 13 months ago (cancelled)", "cancelled", 13);
    await add("closed 13 months ago (done)", "done", 13);
    await add("closed 11 months ago", "done", 11);
    await add("open, new, 3 years old", "new", null);
    await add("open, contacted, 3 years old", "contacted", null);
    const reopened = await add("reopened", "sold", 13);
    await db.query("update public.submissions set status = 'contacted' where id = $1", [reopened]);

    const others = async () =>
      (
        await db.query(
          `select (select count(*) from public.items)::int as items,
                  (select count(*) from public.shop_submissions)::int as shop,
                  (select count(*) from public.admin_audit_log)::int as audit`,
        )
      ).rows[0];
    const before = await others();
    assert.ok(before.items > 0 && before.shop === 1 && before.audit === 1);

    const { rows } = await db.query("select public.purge_closed_requests() as n");
    assert.equal(rows[0].n, 3);
    assert.deepEqual(await names(), [
      "closed 11 months ago",
      "open, contacted, 3 years old",
      "open, new, 3 years old",
      "reopened",
    ]);
    assert.deepEqual(
      await others(),
      before,
      "items, shop submissions and the audit log are untouched",
    );

    const again = await db.query("select public.purge_closed_requests() as n");
    assert.equal(again.rows[0].n, 0, "running it twice deletes nothing more");

    const later = await db.query(
      "select public.purge_closed_requests(now() + interval '1 month 1 day') as n",
    );
    assert.equal(later.rows[0].n, 1, "a month later, the 11-month-old one goes too");
  });

  test("visitors, shop owners and staff can't run the clean-up", async () => {
    for (const user of [null, staff]) {
      await assert.rejects(
        as(db, user, (tx) => tx.query("select public.purge_closed_requests()")),
        /permission denied/,
      );
    }
  });

  test("the daily job script schedules the clean-up", () => {
    const cron = readSql("../supabase-fixes/2026-10-23-request-retention-cron.sql");
    assert.match(cron, /cron\.schedule\('reloop-request-retention', '0 22 \* \* \*'/);
    assert.match(cron, /public\.purge_closed_requests\(\)/);
  });
});

describe("tracked links (20261024000001)", () => {
  let db;
  let admin;
  let staff;
  let user;
  before(async () => {
    db = await createTestDb({ seed: false });
    admin = await createUser(db, "Admin");
    await db.query("insert into public.admin_users (id, name) values ($1, 'Admin')", [admin]);
    staff = await createUser(db, "Staff", { staff: true });
    user = await createUser(db, "Visitor");
  });
  const click =
    (slug, source = "instagram", medium = "bio") =>
    (tx) =>
      tx.query("insert into public.link_visits (slug, source, medium) values ($1, $2, $3)", [
        slug,
        source,
        medium,
      ]);
  const counts = (who) =>
    as(db, who, (tx) => tx.query("select * from public.link_visit_counts() order by slug"));

  test("only the server records clicks, with valid values and nothing personal", async () => {
    await asService(db, click("ig-bio"));
    await asService(db, click("ig-bio"));
    await asService(db, click("wa", "whatsapp", "share"));
    await assert.rejects(asService(db, click("Bad Slug!")), /check constraint/);
    for (const who of [null, user, staff, admin])
      await assert.rejects(as(db, who, click("ig-bio")), /permission denied/);
    const { rows } = await db.query(
      "select column_name from information_schema.columns where table_name = 'link_visits' order by ordinal_position",
    );
    assert.deepEqual(
      rows.map((r) => r.column_name),
      ["id", "slug", "source", "medium", "visited_at"],
    );
  });

  test("admins see clicks per link this month and all time; nobody reads the table", async () => {
    await db.query(
      "insert into public.link_visits (slug, source, medium, visited_at) values ('ig-bio', 'instagram', 'bio', now() - interval '3 months')",
    );
    const { rows } = await counts(admin);
    assert.deepEqual(
      rows.map((r) => [r.slug, Number(r.this_month), Number(r.all_time)]),
      [
        ["ig-bio", 2, 3],
        ["wa", 1, 1],
      ],
    );
    await assert.rejects(counts(staff), /Only admins/);
    await assert.rejects(counts(user), /Only admins/);
    await assert.rejects(counts(null), /permission denied/);
    for (const who of [null, user, admin])
      await assert.rejects(
        as(db, who, (tx) => tx.query("select id from public.link_visits")),
        /permission denied/,
      );
  });

  test("QR scans counted before the change carry over as /go/drive visits, once", async () => {
    const fresh = await createTestDb({
      migrations: MIGRATIONS.filter((m) => m < "20261024000001"),
      seed: false,
    });
    await fresh.query("insert into public.qr_scans (campaign) values ('awareness-drive-2026')");
    await fresh.query("insert into public.qr_scans (campaign) values ('awareness-drive-2026')");
    const migration = readSql("20261024000001_link_visits.sql");
    await fresh.exec(migration);
    await fresh.exec(migration);
    const { rows } = await fresh.query(
      "select slug, source, medium, count(*)::int as n from public.link_visits group by 1, 2, 3",
    );
    assert.deepEqual(rows, [{ slug: "drive", source: "qr", medium: "print", n: 2 }]);
  });
});

describe("impact counter (20261025000001)", () => {
  let db;
  before(async () => {
    db = await createTestDb({ seed: false });
  });
  const item = (grade, source = "repair_shop", category = "accessory", partType = null) =>
    db.query(
      `insert into public.items (source_type, category, part_type, grade, buy_mode)
       values ($1, $2, $3, $4, 'cash')`,
      [source, category, partType, grade],
    );
  const totals = (who) =>
    as(db, who, (tx) => tx.query("select * from public.impact_totals")).then((r) => r.rows);

  test("starts at zero, so the home page shows the pilot message", async () => {
    assert.deepEqual(
      (await totals(null)).map((r) => [
        Number(r.items_reused),
        Number(r.kg_recycled),
        Number(r.active_partner_shops),
      ]),
      [[0, 0, 0]],
    );
  });

  test("counts A, B and C items once, kilograms handed over, and active partners", async () => {
    for (const g of ["A", "B", "C", "D", null]) await item(g);
    await item("C", "stripped", "part", "ram"); // a part taken from a C item: not counted again
    await db.query(
      `insert into public.handovers (recycler, kg_by_category, battery_kg, receipt_no)
       values ('VRG Groups', '{"laptop": 12.5, "monitor": 30}', 4.25, 'R-1'),
              ('VRG Groups', '{}', 1, 'R-2')`,
    );
    await db.query(
      `insert into public.partners (type, name, phone, status)
       values ('repair_shop', 'Active One', '9000000001', 'active'),
              ('retailer', 'Lead Two', '9000000002', 'lead'),
              ('repair_shop', 'Paused Three', '9000000003', 'paused')`,
    );
    // A sample listing never counts.
    await db.query(
      "insert into public.listings (title, price, is_sample) values ('Sample', 100, true)",
    );
    const [row] = await totals(null);
    assert.equal(Number(row.items_reused), 3);
    assert.equal(Number(row.kg_recycled), 47.8);
    assert.equal(Number(row.active_partner_shops), 1);
  });

  test("shows only the three totals; visitors still can't read the tables behind them", async () => {
    const { rows } = await db.query(
      "select column_name from information_schema.columns where table_name = 'impact_totals' order by ordinal_position",
    );
    assert.deepEqual(
      rows.map((r) => r.column_name),
      ["items_reused", "kg_recycled", "active_partner_shops"],
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select buy_paise from public.items")),
      /permission denied/,
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select kg_by_category from public.handovers")),
      /permission denied/,
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select phone from public.partners")),
      /permission denied/,
    );
  });
});

describe("v1 security baseline (20261026000001)", () => {
  let db;
  let staff;
  let admin;
  let buyer;
  let owner;
  let submission;
  before(async () => {
    db = await createTestDb({ migrations: LIVE, seed: false });
    await db.exec(readSql(FIX_SCRIPT));
    for (const m of MIGRATIONS.filter((m) => m > "20261014999999")) await db.exec(readSql(m));
    staff = await createUser(db, "Hub Staff", { staff: true });
    admin = await createUser(db, "Admin");
    await db.query("insert into public.admin_users (id, name) values ($1, 'Admin')", [admin]);
    buyer = await createUser(db, "Buyer");
    owner = await shopOwner(db, "Owner");
    await db.query("update public.shop_owners set verification_status = 'verified'");
    const { rows } = await asService(db, (tx) =>
      tx.query(
        `insert into public.shop_submissions (shop_owner_id, item_name, quantity, condition)
         values ($1, 'Old phones', 2, 'Damaged') returning id`,
        [owner],
      ),
    );
    submission = rows[0].id;
  });
  const access = (who) =>
    as(db, who, (tx) => tx.query("select public.my_access() as a")).then((r) => r.rows[0].a);

  test("my_access tells each role what to show, and visitors can't call it", async () => {
    assert.deepEqual(
      [
        (await access(buyer)).role,
        (await access(buyer)).is_staff,
        (await access(buyer)).shop_status,
      ],
      ["buyer", false, null],
    );
    const shop = await access(owner);
    assert.deepEqual(
      [shop.role, shop.shop_status, shop.is_admin],
      ["shop_owner", "verified", false],
    );
    const hub = await access(staff);
    assert.deepEqual([hub.is_staff, hub.is_admin], [true, false]);
    const boss = await access(admin);
    assert.deepEqual(
      [boss.is_staff, boss.is_admin, boss.must_change_password],
      [true, true, false],
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select public.my_access()")),
      /permission denied/,
    );
  });

  test("the legacy listings and categories are read-only for everyone, admins included", async () => {
    for (const who of [null, buyer, admin]) {
      for (const sql of [
        "insert into public.listings (title, price) values ('x', 1)",
        "update public.listings set price = 1",
        "delete from public.listings",
        "insert into public.categories (name) values ('x')",
        "update public.categories set name = 'x'",
      ])
        await assert.rejects(
          as(db, who, (tx) => tx.query(sql)),
          /permission denied/,
          sql,
        );
    }
  });

  test("staff review submissions through the review columns only, and buying still works", async () => {
    await as(db, staff, (tx) =>
      tx.query(
        "update public.shop_submissions set status = 'Offered', offer_price = 200, offer_note = 'ok', reviewed_at = now(), reviewed_by = $2 where id = $1",
        [submission, staff],
      ),
    );
    for (const col of ["purchase_price = 1", `shop_owner_id = '${buyer}'`, "internal_notes = 'x'"])
      await assert.rejects(
        as(db, staff, (tx) =>
          tx.query(`update public.shop_submissions set ${col} where id = $1`, [submission]),
        ),
        /permission denied/,
        col,
      );
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query("update public.shop_submissions set status = 'Purchased' where id = $1", [
          submission,
        ]),
      ),
      /bought only through/,
      "staff can't mark a lot bought without creating its hub items",
    );
    const { rows } = await as(db, staff, (tx) =>
      tx.query("select public.convert_submission($1, 'phone', null, 20000) as tags", [submission]),
    );
    assert.equal(rows[0].tags.length, 2, "convert_submission still buys the lot");
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query("update public.shop_submissions set status = 'Offered' where id = $1", [
          submission,
        ]),
      ),
      /can no longer be changed/,
    );
  });

  test("roles change only through set_account_role, which logs every change", async () => {
    for (const sql of [
      `insert into public.admin_users (id, name) values ('${buyer}', 'x')`,
      `insert into public.staff (user_id, full_name) values ('${buyer}', 'x')`,
      "update public.staff set role = 'admin'",
      "delete from public.staff",
    ])
      await assert.rejects(
        as(db, admin, (tx) => tx.query(sql)),
        /permission denied/,
        sql,
      );
    await as(db, admin, (tx) =>
      tx.query("select public.set_account_role($1, true, false)", [buyer]),
    );
    assert.equal((await access(buyer)).is_staff, true);
    const log = await db.query(
      "select count(*)::int as n from public.admin_audit_log where target_user_id = $1",
      [buyer],
    );
    assert.equal(log.rows[0].n, 1);
  });
});

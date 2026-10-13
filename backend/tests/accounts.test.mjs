import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { as, createTestDb, createUser } from "./db.mjs";

let db;
let staff;
let buyer;

async function signUp(meta, email) {
  const { rows } = await db.query(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, meta],
  );
  return rows[0].id;
}

const GSTIN_A = "01ABCDE1234F1Z5";
const GSTIN_B = "02ABCDE1234F1Z6";

/** Runs `fn` as the service role (the server-side key, which bypasses RLS). */
function asService(fn) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    return fn(tx);
  });
}

before(async () => {
  db = await createTestDb();
  staff = await createUser(db, "Hub Staff", { staff: true });
  buyer = await createUser(db, "Buyer");
});

describe("signup trigger", () => {
  test("creates a buyer profile by default", async () => {
    const { rows } = await db.query("select role from public.profiles where user_id = $1", [buyer]);
    assert.equal(rows[0].role, "buyer");
  });

  test("ignores an invalid account type", async () => {
    const id = await signUp({ account_type: "admin", full_name: "Mallory Admin" }, "mallory@test.local");
    const { rows } = await db.query("select role from public.profiles where user_id = $1", [id]);
    assert.equal(rows[0].role, "buyer");
  });

  test("never fails on odd names, phones or GSTINs", async () => {
    const id = await signUp(
      {
        account_type: "shop_owner",
        full_name: "A",
        phone: "12",
        gstin: "not-a-gstin",
        shop_name: "x".repeat(500),
        business_address: "y".repeat(900),
      },
      "odd@test.local",
    );
    const profile = await db.query("select full_name, phone from public.profiles where user_id = $1", [id]);
    assert.equal(profile.rows[0].full_name, "ReLoop user");
    assert.equal(profile.rows[0].phone, "not-provided");
    const shop = await db.query(
      "select gstin, verification_status, char_length(shop_name) as n from public.shop_owners where id = $1",
      [id],
    );
    assert.equal(shop.rows[0].gstin, null);
    assert.equal(shop.rows[0].verification_status, "pending");
    assert.equal(shop.rows[0].n, 120);
  });

  test("tidies phone numbers", async () => {
    const id = await signUp({ full_name: "Asha Devi", phone: "+91 98765-43210" }, "asha@test.local");
    const { rows } = await db.query("select phone from public.profiles where user_id = $1", [id]);
    assert.equal(rows[0].phone, "+919876543210");
  });

  test("two pending shops may share a GSTIN, so nobody can squat it", async () => {
    await signUp({ account_type: "shop_owner", full_name: "Real Owner", gstin: GSTIN_A, shop_name: "Real" }, "real@test.local");
    await signUp({ account_type: "shop_owner", full_name: "Squatter", gstin: GSTIN_A, shop_name: "Fake" }, "fake@test.local");
    const { rows } = await db.query("select count(*)::int as n from public.shop_owners where gstin = $1", [GSTIN_A]);
    assert.equal(rows[0].n, 2);
  });
});

describe("shop verification", () => {
  let owner;
  before(async () => {
    owner = await signUp(
      { account_type: "shop_owner", full_name: "Ravi Kumar", gstin: GSTIN_B, shop_name: "Ravi Electronics" },
      "ravi@test.local",
    );
  });

  test("an owner cannot verify themselves or change their role", async () => {
    const result = await as(db, owner, (tx) =>
      tx.query("update public.shop_owners set verification_status = 'verified' where id = $1 returning id", [owner]),
    ).catch((error) => ({ rows: [], error }));
    assert.equal(result.rows.length, 0);
    await assert.rejects(
      as(db, owner, (tx) => tx.query("update public.profiles set role = 'buyer' where user_id = $1", [owner])),
      /permission denied/,
    );
    const { rows } = await db.query("select verification_status from public.shop_owners where id = $1", [owner]);
    assert.equal(rows[0].verification_status, "pending");
  });

  test("an owner reads only their own shop", async () => {
    const { rows } = await as(db, owner, (tx) => tx.query("select id from public.shop_owners"));
    assert.deepEqual(rows.map((r) => r.id), [owner]);
  });

  test("only staff can review a shop", async () => {
    await assert.rejects(
      as(db, owner, (tx) => tx.query("select public.review_shop_owner($1, 'verified', '')", [owner])),
      /Only hub staff/,
    );
    await as(db, staff, (tx) =>
      tx.query("select public.review_shop_owner($1, 'verified', 'GSTIN checked')", [owner]),
    );
    const { rows } = await db.query(
      "select verification_status, verified_at is not null as stamped, reviewed_by, review_notes from public.shop_owners where id = $1",
      [owner],
    );
    assert.equal(rows[0].verification_status, "verified");
    assert.equal(rows[0].stamped, true);
    assert.equal(rows[0].reviewed_by, staff);
    assert.equal(rows[0].review_notes, "GSTIN checked");
  });

  test("a GSTIN can be verified for one shop only", async () => {
    const other = await signUp(
      { account_type: "shop_owner", full_name: "Other Owner", gstin: GSTIN_B, shop_name: "Other" },
      "other@test.local",
    );
    await assert.rejects(
      as(db, staff, (tx) => tx.query("select public.review_shop_owner($1, 'verified', '')", [other])),
      /already uses this GSTIN/,
    );
  });

  test("staff can read every shop; rejects unknown statuses", async () => {
    const { rows } = await as(db, staff, (tx) => tx.query("select count(*)::int as n from public.shop_owners"));
    assert.ok(rows[0].n >= 3);
    await assert.rejects(
      as(db, staff, (tx) => tx.query("select public.review_shop_owner($1, 'maybe', '')", [owner])),
      /Unknown verification status/,
    );
  });
});

describe("shop submissions", () => {
  let owner;
  let rival;
  before(async () => {
    owner = await signUp({ account_type: "shop_owner", full_name: "Seller One", shop_name: "Seller One" }, "s1@test.local");
    rival = await signUp({ account_type: "shop_owner", full_name: "Seller Two", shop_name: "Seller Two" }, "s2@test.local");
    await asService((tx) =>
      tx.query(
        "insert into public.shop_submissions (shop_owner_id, item_name, quantity, condition) values ($1, 'Galaxy M31', 2, 'Working')",
        [owner],
      ),
    );
  });

  test("owners see their own submissions, rivals and visitors see none", async () => {
    const mine = await as(db, owner, (tx) => tx.query("select item_name from public.shop_submissions"));
    assert.equal(mine.rows.length, 1);
    const theirs = await as(db, rival, (tx) => tx.query("select item_name from public.shop_submissions"));
    assert.equal(theirs.rows.length, 0);
    await assert.rejects(as(db, null, (tx) => tx.query("select * from public.shop_submissions")), /permission denied/);
  });

  test("staff can read and triage them", async () => {
    const { rows } = await as(db, staff, (tx) =>
      tx.query("update public.shop_submissions set status = 'Reviewing' returning status"),
    );
    assert.equal(rows[0].status, "Reviewing");
  });

  test("owners cannot insert directly or edit their status", async () => {
    await assert.rejects(
      as(db, owner, (tx) =>
        tx.query(
          "insert into public.shop_submissions (shop_owner_id, item_name, quantity, condition) values ($1, 'x', 1, 'Working')",
          [owner],
        ),
      ),
      /permission denied/,
    );
    await assert.rejects(
      as(db, owner, (tx) => tx.query("update public.shop_submissions set status = 'Accepted'")),
      /permission denied/,
    );
  });

  test("rejects bad quantities, conditions and image links", async () => {
    const insert = (fields) =>
      asService((tx) =>
        tx.query(
          "insert into public.shop_submissions (shop_owner_id, item_name, quantity, condition, image_url) values ($1, 'x', $2, $3, $4)",
          [owner, fields.quantity ?? 1, fields.condition ?? "Working", fields.image ?? null],
        ),
      );
    await assert.rejects(insert({ quantity: 0 }), /violates check constraint/);
    await assert.rejects(insert({ condition: "Mint" }), /violates check constraint/);
    await assert.rejects(insert({ image: "http://example.com/a.jpg" }), /violates check constraint/);
    await insert({ image: "https://example.com/a.jpg" });
  });
});

describe("institution requests", () => {
  test("browsers cannot read or write them; the server can", async () => {
    await assert.rejects(
      as(db, null, (tx) =>
        tx.query("insert into public.institution_submissions (institution_name, contact_name, phone) values ('College', 'Dean', '9876543210')"),
      ),
      /permission denied/,
    );
    await asService((tx) =>
      tx.query(
        "insert into public.institution_submissions (institution_name, contact_name, phone, details) values ('Govt College', 'Dr Sharma', '9876543210', '{\"type\":\"College\"}')",
      ),
    );
    await assert.rejects(as(db, buyer, (tx) => tx.query("select * from public.institution_submissions")), /permission denied/);
    const { rows } = await as(db, staff, (tx) => tx.query("select institution_name, status from public.institution_submissions"));
    assert.deepEqual(rows, [{ institution_name: "Govt College", status: "Pending" }]);
  });

  test("oversized details are refused", async () => {
    await assert.rejects(
      asService((tx) =>
        tx.query(
          "insert into public.institution_submissions (institution_name, contact_name, phone, details) values ('College', 'Dean', '9876543210', $1)",
          [{ blob: "z".repeat(9000) }],
        ),
      ),
      /violates check constraint/,
    );
  });
});

describe("rate limiter", () => {
  test("allows up to the limit, then refuses", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) {
      const { rows } = await asService((tx) => tx.query("select public.hit_rate_limit('test:ip', 3, 60) as ok"));
      results.push(rows[0].ok);
    }
    assert.deepEqual(results, [true, true, true, false]);
  });

  test("browsers cannot call it or read the table", async () => {
    await assert.rejects(as(db, null, (tx) => tx.query("select public.hit_rate_limit('x', 1, 60)")), /permission denied/);
    await assert.rejects(as(db, buyer, (tx) => tx.query("select * from public.rate_limits")), /permission denied/);
  });
});

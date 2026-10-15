import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { as, createTestDb, createUser } from "./db.mjs";

// Business Plan v2, step 3 (20261106000004-5): the Jammu Parts Exchange and part returns.
let db;
let staff;
let buyer;
let owner;
let unlinked;
let partner;

const submit = (who, over = {}) => {
  const a = {
    type: "board",
    brand: "Lenovo",
    model: "IdeaPad 320",
    desc: "Boots to BIOS",
    ask: 250000,
    named: true,
    photos: [],
    ...over,
  };
  return as(db, who, (tx) =>
    tx.query("select public.submit_part_listing($1, $2, $3, $4, $5, $6, $7) as id", [
      a.type,
      a.brand,
      a.model,
      a.desc,
      a.ask,
      a.named,
      a.photos,
    ]),
  );
};
const staffCall = (sql, params) => as(db, staff, (tx) => tx.query(sql, params));

before(async () => {
  db = await createTestDb();
  staff = await createUser(db, "Hub Staff", { staff: true });
  buyer = await createUser(db, "Buyer");
  owner = await createUser(db, "Shop Owner", {
    meta: {
      account_type: "shop_owner",
      shop_name: "Sharma Mobiles",
      business_address: "Bahu Plaza",
    },
  });
  unlinked = await createUser(db, "Unlinked Owner", {
    meta: { account_type: "shop_owner", shop_name: "No Partner", business_address: "Janipur" },
  });
  await db.query(
    "update public.shop_owners set verification_status = 'verified' where id in ($1, $2)",
    [owner, unlinked],
  );
  partner = (
    await db.query(
      `insert into public.partners (type, name, phone, status, route_day, market, shop_owner_id)
       values ('repair_shop', 'Sharma Mobiles', '9000000001', 'active', 'tue', 'Bahu Plaza', $1) returning id`,
      [owner],
    )
  ).rows[0].id;
});

describe("listing parts", () => {
  test("only a verified shop owner linked to an active partner can list, and must agree to be named", async () => {
    await assert.rejects(submit(buyer), /verified partner shops/);
    await assert.rejects(submit(unlinked), /verified partner shops/);
    await assert.rejects(submit(null), /permission denied/);
    await assert.rejects(submit(owner, { named: false }), /agree to be named/i);
    await assert.rejects(submit(owner, { type: "charger" }), /boards, screens, cameras/);
    await assert.rejects(submit(owner, { photos: ["someone-else/x.jpg"] }), /your own uploads/);
    await assert.rejects(submit(owner, { ask: 5 }), /asking_paise/);
    const ok = await submit(owner, { photos: [`${owner}/a.jpg`] });
    assert.ok(ok.rows[0].id);
    await db.query("update public.shop_owners set verification_status = 'pending' where id = $1", [
      owner,
    ]);
    await assert.rejects(submit(owner), /verified partner shops/);
    await db.query("update public.shop_owners set verification_status = 'verified' where id = $1", [
      owner,
    ]);
  });

  test("the photos bucket is private; a shop uploads only into its own folder", async () => {
    const b = (
      await db.query(
        "select public, file_size_limit from storage.buckets where id = 'part-listing-photos'",
      )
    ).rows[0];
    assert.equal(b.public, false);
    assert.equal(Number(b.file_size_limit), 5242880);
    const up = (who, name) =>
      as(db, who, (tx) =>
        tx.query(
          "insert into storage.objects (bucket_id, name) values ('part-listing-photos', $1)",
          [name],
        ),
      );
    await up(owner, `${owner}/b.jpg`);
    await assert.rejects(up(owner, `${buyer}/b.jpg`), /row-level security/);
    await assert.rejects(up(buyer, `${buyer}/b.jpg`), /row-level security/);
    await assert.rejects(up(null, `x/b.jpg`), /row-level security|permission denied/);
    const read = (who) =>
      as(db, who, (tx) =>
        tx.query("select name from storage.objects where bucket_id = 'part-listing-photos'"),
      );
    assert.equal((await read(null)).rows.length, 0, "visitors read nothing");
    assert.equal((await read(buyer)).rows.length, 0);
    assert.ok((await read(owner)).rows.length >= 1);
    assert.ok((await read(staff)).rows.length >= 1);
  });

  test("a shop sees its own listings only", async () => {
    assert.ok(
      (await as(db, owner, (tx) => tx.query("select * from public.part_listings"))).rows.length >=
        1,
    );
    assert.equal(
      (await as(db, buyer, (tx) => tx.query("select * from public.part_listings"))).rows.length,
      0,
    );
    assert.equal(
      (
        await as(db, null, (tx) =>
          tx.query("select * from public.my_part_listings()").catch(() => ({ rows: [] })),
        )
      ).rows.length,
      0,
    );
  });
});

describe("hub approval and sale", () => {
  let listing;
  let tag;

  test("staff receive the part: a tagged partner listing with no buy price and the 12% on the row", async () => {
    listing = (await submit(owner, { type: "board", ask: 300000 })).rows[0].id;
    tag = (await staffCall("select public.receive_part_listing($1) as t", [listing])).rows[0].t;
    const i = (await db.query("select * from public.items where id = $1", [tag])).rows[0];
    assert.equal(i.source_type, "partner_listing");
    assert.equal(Number(i.buy_paise), 0);
    assert.equal(Number(i.commission_pct), 12);
    assert.equal(i.listed_by_partner_id, partner);
    assert.equal(i.wipe_required, true, "a board is wiped before listing");
    await assert.rejects(
      staffCall("select public.receive_part_listing($1)", [listing]),
      /Only a submitted listing/,
    );
    await assert.rejects(
      as(db, buyer, (tx) => tx.query("select public.receive_part_listing($1)", [listing])),
      /Only hub staff/,
    );
  });

  test("approval needs the test and the wipe; then the part is on sale at the shop's price", async () => {
    await assert.rejects(
      staffCall("select public.approve_part_listing($1)", [listing]),
      /Test and inspect/,
    );
    await db.query(
      `update public.items set inspection = '{"version":1,"checks":{"Boots":"pass"}}', inspected_at = now() where id = $1`,
      [tag],
    );
    await assert.rejects(
      staffCall("select public.approve_part_listing($1)", [listing]),
      /Wipe the part/,
    );
    await db.query(
      "update public.items set wiped_at = now(), wipe_method = 'reset_overwrite' where id = $1",
      [tag],
    );
    await staffCall("select public.approve_part_listing($1)", [listing]);
    const i = (
      await db.query("select status, current_paise, grade from public.items where id = $1", [tag])
    ).rows[0];
    assert.equal(i.status, "listed");
    assert.equal(Number(i.current_paise), 300000);
    const mine = await as(db, owner, (tx) => tx.query("select * from public.my_part_listings()"));
    assert.ok(mine.rows.some((r) => r.item_id === tag && r.status === "approved"));
  });

  test("visitors see the part with the shop named, never the commission, buy price or source", async () => {
    const v = await as(db, null, (tx) =>
      tx.query("select * from public.parts_exchange_listings where item_id = $1", [tag]),
    );
    assert.equal(v.rows.length, 1);
    assert.equal(v.rows[0].listed_by_name, "Sharma Mobiles");
    assert.equal(v.rows[0].listed_by_market, "Bahu Plaza");
    assert.deepEqual(Object.keys(v.rows[0]).sort(), [
      "brand",
      "current_paise",
      "description",
      "item_id",
      "listed_at",
      "listed_by_market",
      "listed_by_name",
      "model",
      "part_type",
      "price_cut_at",
      "status",
    ]);
    await assert.rejects(
      as(db, null, (tx) => tx.query("select commission_pct from public.items")),
      /permission denied/,
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select * from public.exchange_sales")),
      /permission denied/,
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select * from public.part_listings")),
      /permission denied/,
    );
    await db.query("update public.part_listings set agree_named = agree_named where id = $1", [
      listing,
    ]);
  });

  test("a sale records the commission; the shop is paid after day 7, never before, never after a refund", async () => {
    await staffCall("update public.items set status = 'sold', sold_paise = 300000 where id = $1", [
      tag,
    ]);
    const sale = (await db.query("select * from public.exchange_sales where item_id = $1", [tag]))
      .rows[0];
    assert.equal(Number(sale.commission_paise), 36000);
    assert.equal(Number(sale.shop_share_paise), 264000);
    const pay = () => staffCall("select * from public.pay_part_sale($1)", [sale.id]);
    await assert.rejects(pay(), /7-day return window/);
    // A return opened inside the window and refunded cancels the shop's share.
    await db.query(
      "update public.exchange_sales set payout_due_on = current_date - 1 where id = $1",
      [sale.id],
    );
    await db.query(
      "insert into public.warranty_claims (item_id, opened_by, fault, kind) values ($1, 'staff', 'Does not boot when fitted', 'part_return')",
      [tag],
    );
    await assert.rejects(pay(), /return on this part is still open/);
    await db.query(
      "update public.warranty_claims set status = 'refunded', closed_at = now() where item_id = $1",
      [tag],
    );
    assert.equal(
      (await db.query("select status from public.exchange_sales where id = $1", [sale.id])).rows[0]
        .status,
      "refunded",
    );
    await assert.rejects(pay(), /refunded/);
  });

  test("an unreturned sale is paid on its own receipt line, once", async () => {
    const l2 = (await submit(owner, { type: "screen", ask: 100000 })).rows[0].id;
    const t2 = (await staffCall("select public.receive_part_listing($1) as t", [l2])).rows[0].t;
    await db.query(
      `update public.items set inspection = '{"version":1,"checks":{}}', inspected_at = now(), grade = 'C',
              wiped_at = now(), wipe_method = 'reset_overwrite' where id = $1`,
      [t2],
    );
    await staffCall("select public.approve_part_listing($1)", [l2]);
    await staffCall("update public.items set status = 'sold', sold_paise = 100000 where id = $1", [
      t2,
    ]);
    const sale = (
      await db.query("select id, payout_due_on from public.exchange_sales where item_id = $1", [t2])
    ).rows[0];
    await db.query("update public.exchange_sales set payout_due_on = current_date where id = $1", [
      sale.id,
    ]);
    const r = (await staffCall("select * from public.pay_part_sale($1, 'upi')", [sale.id])).rows[0];
    assert.equal(Number(r.amount_paise), 88000);
    await assert.rejects(staffCall("select * from public.pay_part_sale($1)", [sale.id]), /paid/);
    const row = (
      await db.query("select line, exchange_sale_id from public.payouts where receipt_no = $1", [
        r.receipt_no,
      ])
    ).rows[0];
    assert.equal(row.line, "part_sale");
    assert.equal(row.exchange_sale_id, sale.id);
  });

  test("rejecting a listing tells the shop why", async () => {
    const l3 = (await submit(owner, { type: "ram", ask: 50000 })).rows[0].id;
    await assert.rejects(staffCall("select public.reject_part_listing($1, 'no')", [l3]), /why/);
    await staffCall("select public.reject_part_listing($1, 'Memory test failed twice')", [l3]);
    const n = await as(db, owner, (tx) =>
      tx.query("select title from public.notifications where kind = 'part_rejected'"),
    );
    assert.equal(n.rows.length, 1);
    await as(db, owner, (tx) => tx.query("select public.withdraw_part_listing($1)", [l3])).then(
      () => assert.fail("expected rejection"),
      (e) => assert.match(String(e.message), /can no longer be withdrawn/),
    );
  });
});

describe("part returns", () => {
  test("a part has 7 days, a device 30; a part return is its own kind", async () => {
    const mk = async (fields) =>
      (
        await db.query(
          `insert into public.items (source_type, category, part_type, buy_mode, grade, status, sold_at, sold_paise, wiped_at)
           values ('repair_shop', $1, $2, 'cash', $3, 'sold', $4, 1000, now()) returning id`,
          [fields.category, fields.part_type ?? null, fields.grade, fields.sold_at],
        )
      ).rows[0].id;
    const fresh = await mk({
      category: "part",
      part_type: "screen",
      grade: "C",
      sold_at: new Date(Date.now() - 3 * 864e5),
    });
    const old = await mk({
      category: "part",
      part_type: "screen",
      grade: "C",
      sold_at: new Date(Date.now() - 9 * 864e5),
    });
    const phone = await mk({
      category: "phone",
      grade: "A",
      sold_at: new Date(Date.now() - 20 * 864e5),
    });
    const log = (id) =>
      staffCall(
        "select public.log_warranty_claim($1, 'Asha', '9876543210', 'Does not fit the stated model') as id",
        [id],
      );
    await log(fresh);
    await assert.rejects(log(old), /not covered/);
    await log(phone);
    const kinds = (
      await db.query("select item_id, kind from public.warranty_claims where item_id in ($1, $2)", [
        fresh,
        phone,
      ])
    ).rows;
    assert.equal(kinds.find((k) => k.item_id === fresh).kind, "part_return");
    assert.equal(kinds.find((k) => k.item_id === phone).kind, "warranty");
  });
});

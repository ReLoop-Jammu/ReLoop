import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { as, createTestDb, createUser } from "./db.mjs";

// Batch 20 (20261107000002): the route run sheet and closing repair jobs.
let db;
let staff;
let buyer;
const q = (who, sql, params) => as(db, who, (tx) => tx.query(sql, params));

// Tuesday 10 Nov 2026 and Friday 13 Nov 2026 are route days; Wednesday is not.
const TUE = "2026-11-10";
const FRI = "2026-11-13";
const WED = "2026-11-11";

before(async () => {
  db = await createTestDb();
  staff = await createUser(db, "Route Staff", { staff: true });
  buyer = await createUser(db, "Route Buyer");
});

const partner = async (name, market, day, type = "repair_shop", status = "active") =>
  (
    await db.query(
      `insert into public.partners (type, name, phone, status, route_day, market)
       values ($1, $2, '9000000001', $3, $4, $5) returning id`,
      [type, name, status, day, market],
    )
  ).rows[0].id;

describe("route_sheet", () => {
  test("lists active partners on their weekday, in the market's start window, and no one else", async () => {
    await partner("Tue Shop", "Bahu Plaza", "tue");
    await partner("Fri Shop", "Raghunath Bazaar", "fri");
    await partner("Lead Shop", "Bahu Plaza", "tue", "repair_shop", "lead");
    const tue = (await q(staff, "select * from public.route_sheet($1)", [TUE])).rows;
    assert.deepEqual(
      tue.map((r) => r.name),
      ["Tue Shop"],
    );
    assert.equal(tue[0].stop_kind, "standing");
    const wed = (await q(staff, "select * from public.route_sheet($1)", [WED])).rows;
    assert.equal(wed.length, 0);
    // Friday markets start on their own date (route.markets), so a Friday before it is empty.
    const early = (await q(staff, "select * from public.route_sheet($1)", [FRI])).rows;
    assert.deepEqual(
      early.map((r) => r.name),
      [],
    );
    const later = (await q(staff, "select * from public.route_sheet('2027-01-15')")).rows;
    assert.deepEqual(
      later.map((r) => r.name),
      ["Fri Shop"],
    );
  });

  test("shows the last weigh-in and keeps retailers to once a month", async () => {
    const shop = (await db.query("select id from public.partners where name = 'Tue Shop'")).rows[0]
      .id;
    await q(staff, "select * from public.record_weighin($1, 10, 5, 0, 20, 0, '', true, false)", [
      shop,
    ]);
    await db.query(
      "update public.scrap_weighins set weighed_at = '2026-11-10 12:00+05:30' where partner_id = $1",
      [shop],
    );
    const shopRow = (await q(staff, "select * from public.route_sheet('2026-11-17')")).rows.find(
      (r) => r.name === "Tue Shop",
    );
    assert.equal(Number(shopRow.last_kg), 35);
    const ret = await partner("Retail One", "Gole Market", "tue", "retailer");
    const first = (await q(staff, "select * from public.route_sheet($1)", [TUE])).rows;
    assert.ok(
      first.some((r) => r.partner_id === ret),
      "never weighed: due",
    );
    await q(staff, "select * from public.record_weighin($1, 0, 0, 0, 12, 0, '', true, false)", [
      ret,
    ]);
    await db.query(
      "update public.scrap_weighins set weighed_at = '2026-11-10 12:00+05:30' where partner_id = $1",
      [ret],
    );
    const week = (await q(staff, "select * from public.route_sheet('2026-11-17')")).rows;
    assert.ok(!week.some((r) => r.partner_id === ret), "weighed this week: not due again");
  });

  test("booked pickups for the date join the sheet, and a missed one moves to the next route day", async () => {
    const owner = await createUser(db, "Sheet Owner", {
      meta: {
        account_type: "shop_owner",
        shop_name: "Booked Mobiles",
        business_address: "Bahu Plaza",
      },
    });
    await db.query("update public.shop_owners set verification_status = 'verified' where id = $1", [
      owner,
    ]);
    const sub = (
      await db.query(
        `insert into public.shop_submissions (shop_owner_id, item_name, quantity, status)
         values ($1, 'Routers', 4, 'Accepted') returning id`,
        [owner],
      )
    ).rows[0].id;
    const pk = (
      await db.query(
        `insert into public.pickups (source, shop_submission_id, shop_owner_id, route_date, market)
         values ('shop', $1, $2, $3, 'Bahu Plaza') returning id`,
        [sub, owner, FRI],
      )
    ).rows[0].id;
    const sheet = (await q(staff, "select * from public.route_sheet($1)", [FRI])).rows;
    const stop = sheet.find((r) => r.pickup_id === pk);
    assert.equal(stop.stop_kind, "pickup");
    assert.equal(stop.name, "Booked Mobiles");
    assert.equal(stop.expected_items, 4);
    assert.equal(stop.item_label, "Routers");
    await q(staff, "select public.set_pickup_status($1, 'missed')", [pk]);
    const after = (
      await db.query("select route_date::text, times_missed from public.pickups where id = $1", [
        pk,
      ])
    ).rows[0];
    assert.equal(after.times_missed, 1);
    assert.ok(after.route_date > FRI);
  });

  test("only staff can see the route", async () => {
    await assert.rejects(q(buyer, "select * from public.route_sheet($1)", [TUE]), /Only hub staff/);
    await assert.rejects(q(null, "select * from public.route_sheet($1)", [TUE]));
  });
});

describe("return_repair_job", () => {
  const sent = async () => {
    const shop = await partner(`Fixer ${Math.random()}`, "Gole Market", "tue");
    const item = (
      await db.query(
        `insert into public.items (source_type, category, buy_mode, grade, status, inspection, inspected_at)
         values ('repair_shop', 'monitor', 'cash', 'B', 'out_for_repair', '{"version":1,"checks":{"display":"pass"}}', now()) returning id`,
      )
    ).rows[0].id;
    const job = (
      await db.query(
        `insert into public.repair_jobs (item_id, partner_id, fault, fee_paise) values ($1, $2, 'No display', 40000) returning id`,
        [item, shop],
      )
    ).rows[0].id;
    return { item, job };
  };

  test("fixed sends the item back to be re-tested and records the outcome", async () => {
    const { item, job } = await sent();
    await q(staff, "select public.return_repair_job($1, 'fixed')", [job]);
    const i = (await db.query("select status, grade from public.items where id = $1", [item]))
      .rows[0];
    assert.deepEqual({ ...i }, { status: "graded", grade: "B" });
    const j = (
      await db.query(
        "select outcome, returned_at is not null as closed, fee_paise from public.repair_jobs where id = $1",
        [job],
      )
    ).rows[0];
    assert.deepEqual(
      { ...j, fee_paise: Number(j.fee_paise) },
      { outcome: "fixed", closed: true, fee_paise: 40000 },
    );
    const notes = (
      await db.query(
        "select note from public.item_events where item_id = $1 and note like 'Back from repair%'",
        [item],
      )
    ).rows;
    assert.equal(notes.length, 1);
  });

  test("not fixable drops the item to C for stripping", async () => {
    const { item, job } = await sent();
    await q(staff, "select public.return_repair_job($1, 'not_fixable')", [job]);
    const i = (await db.query("select status, grade from public.items where id = $1", [item]))
      .rows[0];
    assert.deepEqual({ ...i }, { status: "stripping", grade: "C" });
  });

  test("a job closes once, staff only, with a known outcome", async () => {
    const { job } = await sent();
    await assert.rejects(
      q(buyer, "select public.return_repair_job($1, 'fixed')", [job]),
      /Only hub staff/,
    );
    await assert.rejects(
      q(staff, "select public.return_repair_job($1, 'maybe')", [job]),
      /fixed or not_fixable/,
    );
    await q(staff, "select public.return_repair_job($1, 'fixed')", [job]);
    await assert.rejects(
      q(staff, "select public.return_repair_job($1, 'fixed')", [job]),
      /already closed/,
    );
  });

  test("repair jobs and their fees are staff-only tables", async () => {
    await assert.rejects(q(null, "select * from public.repair_jobs"), /permission denied/);
    const rows = (await q(buyer, "select * from public.repair_jobs")).rows;
    assert.equal(rows.length, 0);
  });
});

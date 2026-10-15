import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { as, createTestDb, createUser } from "./db.mjs";

// Business Plan v2, step 1 (20261106000001): scope, places and settings.
let db;
let staff;
let admin;
let buyer;

const item = (tx, fields = {}) => {
  const f = { source_type: "repair_shop", category: "phone", buy_mode: "cash", ...fields };
  const cols = Object.keys(f);
  return tx.query(
    `insert into public.items (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    Object.values(f),
  );
};

before(async () => {
  db = await createTestDb();
  staff = await createUser(db, "Hub Staff", { staff: true });
  admin = await createUser(db, "Admin", { staff: true });
  await db.query("update public.staff set role = 'admin' where user_id = $1", [admin]);
  buyer = await createUser(db, "Buyer");
});

describe("removed values are blocked for new rows only", () => {
  test("households, TVs, printers, UPS units, small appliances and shipping are refused", async () => {
    await assert.rejects(
      as(db, staff, (tx) => item(tx, { source_type: "household" })),
      /households/,
    );
    for (const category of ["tv", "printer", "ups", "small_appliance"])
      await assert.rejects(
        as(db, staff, (tx) => item(tx, { category })),
        /TVs, printers/,
      );
    await assert.rejects(
      as(db, staff, (tx) => item(tx, { buy_mode: "consignment" })),
      /consignment/,
    );
    await assert.rejects(
      as(db, staff, (tx) => item(tx, { fulfilment: "ship_india" })),
      /outside Jammu/,
    );
    const ok = await as(db, staff, (tx) => item(tx, { category: "monitor" }));
    assert.match(ok.rows[0].id, /^RL-JMU-/);
  });

  test("an old row keeps working: only a change to a removed value is blocked", async () => {
    await db.exec("alter table public.items disable trigger items_guard_removed_values");
    const { rows } = await item(db, { category: "tv", grade: "D", buy_mode: "free" });
    await db.exec("alter table public.items enable trigger items_guard_removed_values");
    await as(db, staff, (tx) =>
      tx.query("update public.items set hidden = true, rack = 'X1' where id = $1", [rows[0].id]),
    );
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query("update public.items set category = 'printer' where id = $1", [rows[0].id]),
      ),
      /TVs, printers/,
    );
  });

  test("household and consignment requests are refused; the consignments table takes no new rows", async () => {
    for (const kind of ["household_dropoff", "consignment"])
      await assert.rejects(
        db.query("insert into public.submissions (kind, fields) values ($1, '{}')", [kind]),
        /no longer collects/,
      );
    await db.query("insert into public.submissions (kind, fields) values ('enquiry', '{}')");
    const it = await as(db, staff, (tx) => item(tx));
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query(
          "insert into public.consignments (item_id, consignor_name, phone, agreed_paise) values ($1, 'A', '900000', 2000000)",
          [it.rows[0].id],
        ),
      ),
      /consignment is no longer used/,
    );
  });

  test("reference prices for removed categories are refused", async () => {
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query(
          `insert into public.reference_prices (category, low_paise, typical_paise, high_paise, source, checked_on)
           values ('printer', 100, 200, 300, 'test source', current_date)`,
        ),
      ),
      /TVs, printers/,
    );
  });
});

describe("settings", () => {
  const keys = (who) =>
    as(db, who, (tx) => tx.query("select key, value from public.public_settings")).then(
      (r) => r.rows,
    );

  test("the rate card per kg and the commission are public; the plan's figures never are", async () => {
    const pub = await keys(null);
    const byKey = Object.fromEntries(pub.map((r) => [r.key, r.value]));
    assert.equal(byKey["rate_card.screens_paise"], 17000);
    assert.equal(byKey["rate_card.batteries_paise"], 80000);
    assert.equal(byKey["rate_card.boards_paise"], 13000);
    assert.equal(byKey["rate_card.other_paise"], 500);
    assert.equal(byKey["rate_card.commission_pct"], 12);
    assert.ok(byKey["route.markets"]);
    for (const k of Object.keys(byKey)) assert.doesNotMatch(k, /^(finance|vrg)\./, k);
    assert.ok(!("dropoff.shops" in byKey));
    const all = await db.query(
      "select key, is_public from public.app_settings where key ~ '^(finance|vrg)\\.'",
    );
    assert.ok(all.rows.length >= 6);
    assert.ok(all.rows.every((r) => r.is_public === false));
  });

  test("a finance or vrg setting can never be made public", async () => {
    await assert.rejects(
      db.query(
        "update public.app_settings set is_public = true where key = 'finance.device_unit_paise'",
      ),
      /app_settings_private_keys/,
    );
    await assert.rejects(
      db.query(
        "insert into public.app_settings (key, value, is_public) values ('vrg.x', '1', true)",
      ),
      /app_settings_private_keys/,
    );
  });

  test("staff read the staff-only settings, buyers and visitors do not", async () => {
    const mine = await as(db, staff, (tx) =>
      tx.query("select key from public.app_settings where key like 'finance.%'"),
    );
    assert.ok(mine.rows.length >= 5);
    const theirs = await as(db, buyer, (tx) => tx.query("select key from public.app_settings"));
    assert.equal(theirs.rows.length, 0);
  });

  test("admins set the money settings; they start empty; staff-only numbers can be cleared", async () => {
    const start = await db.query(
      "select value from public.app_settings where key = 'finance.scrap_spread_paise_per_kg'",
    );
    assert.equal(start.rows[0].value, null);
    const set = (who, key, value) =>
      as(db, who, (tx) =>
        tx.query("select public.set_setting($1, $2)", [key, JSON.stringify(value)]),
      );
    await set(admin, "finance.scrap_spread_paise_per_kg", 1234);
    await set(admin, "finance.scrap_spread_paise_per_kg", null);
    await set(admin, "vrg.rates_paise", { screens: 1 });
    await assert.rejects(set(staff, "vrg.rates_paise", {}), /Only admins/);
    await assert.rejects(set(admin, "rate_card.screens_paise", -1), /negative/);
    await assert.rejects(set(admin, "rate_card.screens_paise", null), /must be a JSON number/);
    await assert.rejects(set(admin, "dropoff.shops", []), /Unknown setting/);
    await assert.rejects(set(admin, "pricing.target_margin_pct", 40), /Unknown setting/);
  });

  test("the hub address changes only where it still holds the old seeded text", async () => {
    const { rows } = await db.query(
      "select value from public.app_settings where key = 'hub.address'",
    );
    assert.match(rows[0].value, /Gandhi Nagar, between Bahu Plaza and Gole Market/);
  });
});

describe("route days follow the shop's market", () => {
  const day = async (after, market) =>
    (await db.query("select public.next_route_day($1::date, $2)::text as d", [after, market]))
      .rows[0].d;

  test("Tuesday for the Gandhi Nagar cluster, Friday for the old city, never before the start date", async () => {
    assert.equal(await day("2026-11-01", "Bahu Plaza"), "2026-11-03");
    assert.equal(await day("2026-11-03", "gole market"), "2026-11-10");
    assert.equal(await day("2026-11-01", "Raghunath Bazaar"), "2027-01-08");
    assert.equal(await day("2027-02-01", "Residency Road"), "2027-02-05");
  });

  test("an unknown or empty market falls back to the next Tuesday or Friday only when none is given", async () => {
    assert.equal(await day("2026-11-01", "Janipur"), null);
    assert.equal(await day("2026-11-01", null), "2026-11-03");
    assert.equal(await day("2026-11-03", ""), "2026-11-06");
  });

  test("an accepted offer from a market not on the route waits for a day to be confirmed", async () => {
    const owner = await createUser(db, "Janipur Shop", {
      meta: {
        account_type: "shop_owner",
        shop_name: "Janipur Mobiles",
        business_address: "Janipur, Jammu",
      },
    });
    await db.query(
      "update public.shop_owners set verification_status = 'verified', map_market = 'Janipur' where id = $1",
      [owner],
    );
    const sub = await db.query(
      `insert into public.shop_submissions (shop_owner_id, item_name, quantity, condition, status)
       values ($1, 'Mixed phones', 3, 'Used', 'Offered') returning id`,
      [owner],
    );
    const res = await as(db, owner, (tx) =>
      tx.query("select public.respond_to_offer($1, true, '') as d", [sub.rows[0].id]),
    );
    assert.equal(res.rows[0].d, null);
    const pick = await db.query(
      "select route_date from public.pickups where shop_submission_id = $1",
      [sub.rows[0].id],
    );
    assert.equal(pick.rows[0].route_date, null);
  });
});

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { ADMIN_ID, as, createTestDb, createUser, readSql } from "./db.mjs";

// Batch 16 (20261107000001): impact_flows, network_flows and the buyer's area at sale.
let db;
let staff;
let admin;
let buyer;
const partners = [];

const q = (who, sql, params) => as(db, who, (tx) => tx.query(sql, params));

before(async () => {
  db = await createTestDb();
  staff = await createUser(db, "Hub Staff", { staff: true });
  buyer = await createUser(db, "Buyer");
  admin = ADMIN_ID;
  // Three active shops in Bahu Plaza (a visible market) and one alone in Gole Market.
  for (const [name, market] of [
    ["Bahu A", "Bahu Plaza"],
    ["Bahu B", "Bahu Plaza"],
    ["Bahu C", "Bahu Plaza"],
    ["Lone Shop", "Gole Market"],
  ]) {
    partners.push(
      (
        await db.query(
          `insert into public.partners (type, name, phone, status, route_day, market)
           values ('repair_shop', $1, '9000000000', 'active', 'tue', $2) returning id`,
          [name, market],
        )
      ).rows[0].id,
    );
  }
});

describe("impact_flows and network_flows", () => {
  test("weighed scrap is the only source of scrap kg, and small markets merge", async () => {
    await q(staff, "select * from public.record_weighin($1, 10, 5, 0, 20, 0, '', true, false)", [
      partners[0],
    ]);
    await q(staff, "select * from public.record_weighin($1, 3, 0, 0, 0, 0, '', true, false)", [
      partners[3],
    ]);
    const net = (await q(null, "select * from public.network_flows where kind = 'scrap'")).rows;
    const bahu = net.filter((r) => r.from_node === "Bahu Plaza");
    assert.equal(
      bahu.reduce((s, r) => s + Number(r.kg), 0),
      35,
    );
    assert.ok(
      net.every((r) => r.from_node !== "Gole Market"),
      "a market with one shop is merged",
    );
    const other = net.filter((r) => r.from_node === "Other Jammu markets");
    assert.equal(
      other.reduce((s, r) => s + Number(r.kg), 0),
      3,
    );
    const imp = (await q(null, "select * from public.impact_flows where kind = 'scrap'")).rows;
    assert.deepEqual(new Set(imp.map((r) => r.source_group)), new Set(["Repair shops"]));
    assert.equal(
      imp.reduce((s, r) => s + Number(r.kg), 0),
      38,
    );
    assert.ok(imp.every((r) => r.outcome === "At the hub"));
  });

  test("a handover moves the kg to 'Handed to VRRG Group' and onto the hub to VRRG edge", async () => {
    await q(
      staff,
      "select public.record_bin_handover(array['screens','boards','other'], 'VRRG-IMP')",
    );
    const imp = (await q(null, "select * from public.impact_flows where kind = 'scrap'")).rows;
    assert.ok(imp.every((r) => r.outcome === "Handed to VRRG Group"));
    const vrrg = (await q(null, "select * from public.network_flows where to_node = 'VRRG Group'"))
      .rows;
    assert.equal(
      vrrg.reduce((s, r) => s + Number(r.kg), 0),
      38,
    );
  });

  test("devices and parts count by outcome; kg only where measured", async () => {
    const totals = async () => {
      const rows = (await q(null, "select * from public.impact_flows where kind = 'device'")).rows;
      const out = {};
      for (const r of rows) {
        out[r.outcome] ??= { items: 0, kg: 0 };
        out[r.outcome].items += Number(r.items);
        out[r.outcome].kg += Number(r.kg);
      }
      return out;
    };
    const base = await totals();
    const n = (o, k) => base[o]?.[k] ?? 0;
    await db.query(
      `insert into public.items (source_type, category, buy_mode, grade, status, weight_kg, partner_id)
       values ('repair_shop', 'laptop', 'cash', 'A', 'graded', 2.2, $1),
              ('repair_shop', 'monitor', 'cash', 'C', 'stripping', null, $1),
              ('repair_shop', 'phone', 'cash', 'D', 'in_scrap_cage', 0.2, $1)`,
      [partners[1]],
    );
    const by = await totals();
    const d = (o, k) => by[o][k] - n(o, k);
    assert.equal(d("Resold as devices", "items"), 1);
    assert.equal(d("Resold as devices", "kg").toFixed(1), "2.2");
    assert.equal(d("Stripped for parts", "items"), 1);
    assert.equal(d("Stripped for parts", "kg"), 0, "no weight measured, none claimed");
    assert.equal(d("Handed to VRRG Group", "items"), 1);
  });

  test("hub to buyer area appears only from 3 items, and never names anyone", async () => {
    const mk = (area) =>
      db.query(
        `insert into public.items (source_type, category, buy_mode, grade, status, sold_at, sold_paise, buyer_area)
         values ('repair_shop', 'monitor', 'cash', 'A', 'sold', now(), 100, $1)`,
        [area],
      );
    await mk("Gandhi Nagar");
    await mk("Gandhi Nagar");
    await mk("Trikuta Nagar");
    let areas = (
      await q(
        null,
        "select * from public.network_flows where from_node = 'ReLoop hub' and kind = 'device' and to_node <> 'ReLoop hub' and to_node <> 'VRRG Group'",
      )
    ).rows;
    assert.equal(areas.length, 0, "two items in one area stay hidden");
    await mk("Gandhi Nagar");
    areas = (
      await q(
        null,
        "select * from public.network_flows where kind = 'device' and to_node = 'Gandhi Nagar'",
      )
    ).rows;
    assert.equal(areas.length, 1);
    assert.equal(Number(areas[0].items), 3);
    const cols = (await q(null, "select * from public.network_flows limit 1")).fields.map(
      (f) => f.name,
    );
    assert.deepEqual(cols, ["from_node", "to_node", "kind", "category", "items", "kg"]);
  });
});

describe("buyer areas and access", () => {
  test("the area list is public; only admins change it", async () => {
    const rows = (await q(null, "select name from public.buyer_areas order by sort")).rows;
    assert.equal(rows[0].name, "Collected at the hub");
    await assert.rejects(q(buyer, "insert into public.buyer_areas (name) values ('Nowhere')"));
    await assert.rejects(
      q(staff, "insert into public.buyer_areas (name) values ('Nowhere Staff')"),
    );
    await q(admin, "insert into public.buyer_areas (name, sort) values ('Test Nagar', 90)");
    assert.equal(
      (await q(null, "select 1 from public.buyer_areas where name = 'Test Nagar'")).rows.length,
      1,
    );
  });

  test("the buyer area is cleared when an item is no longer sold, and visitors cannot read it", async () => {
    const id = (
      await db.query(
        `insert into public.items (source_type, category, buy_mode, grade, status, sold_at, sold_paise, buyer_area)
         values ('repair_shop', 'monitor', 'cash', 'A', 'sold', now(), 100, 'Gandhi Nagar') returning id`,
      )
    ).rows[0].id;
    await q(staff, "select public.set_item_buyer_area($1, 'Trikuta Nagar')", [id]);
    assert.equal(
      (await db.query("select buyer_area from public.items where id = $1", [id])).rows[0]
        .buyer_area,
      "Trikuta Nagar",
    );
    await assert.rejects(
      q(buyer, "select public.set_item_buyer_area($1, 'Gandhi Nagar')", [id]),
      /Only hub staff/,
    );
    await assert.rejects(
      q(staff, "select public.set_item_buyer_area($1, 'Atlantis')", [id]),
      /Unknown buyer area/,
    );
    await assert.rejects(
      q(staff, "update public.items set buyer_area = 'Gandhi Nagar' where id = $1", [id]),
      /permission denied/,
    );
    await db.query(
      "update public.items set status = 'graded', sold_at = null, sold_paise = null where id = $1",
      [id],
    );
    assert.equal(
      (await db.query("select buyer_area from public.items where id = $1", [id])).rows[0]
        .buyer_area,
      null,
    );
    await assert.rejects(q(null, "select buyer_area from public.items"), /permission denied/);
    await assert.rejects(
      q(null, "select * from public.partner_market_groups"),
      /permission denied/,
    );
  });

  test("visitors read the two views and nothing behind them", async () => {
    for (const v of ["impact_flows", "network_flows"]) {
      assert.ok((await q(null, `select * from public.${v}`)).rows.length > 0);
      await assert.rejects(q(null, `insert into public.${v} (kg) values (1)`));
    }
    await assert.rejects(q(null, "select * from public.scrap_weighins"), /permission denied/);
    await assert.rejects(q(null, "select * from public.handovers"), /permission denied/);
  });
});

describe("supabase-fixes/live-checks-v3.sql", () => {
  test("every check is true on the repo schema", async () => {
    const { rows } = await db.query(readSql("../supabase-fixes/live-checks-v3.sql"));
    assert.ok(rows.length >= 2);
    assert.deepEqual(
      rows.filter((r) => !r.ok).map((r) => r.check_name),
      [],
    );
  });
});

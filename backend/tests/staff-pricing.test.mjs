import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { as, createTestDb, createUser, readSql } from "./db.mjs";

// Batch 22 (20261107000004): item margins, benchmarks and suggested prices, all staff-only.
let db;
let staff;
let buyer;
let partner;
const q = (who, sql, params) => as(db, who, (tx) => tx.query(sql, params));

before(async () => {
  db = await createTestDb();
  staff = await createUser(db, "Price Staff", { staff: true });
  buyer = await createUser(db, "Price Buyer");
  partner = (
    await db.query(
      `insert into public.partners (type, name, phone, status, route_day, market, is_repair_partner)
       values ('repair_shop', 'Margin Shop', '9000000002', 'active', 'tue', 'Bahu Plaza', true) returning id`,
    )
  ).rows[0].id;
});

describe("item_margins", () => {
  test("COGS is buy + repairs + handling, and margin is sale minus COGS", async () => {
    await db.query(
      `update public.app_settings set value = '{"A": 0, "B": 5000, "C": 0, "D": 0}' where key = 'pricing.handling_paise'`,
    );
    const id = (
      await db.query(
        `insert into public.items (source_type, category, buy_mode, buy_paise, grade, status, sold_at, sold_paise, listed_at)
         values ('repair_shop', 'monitor', 'cash', 100000, 'B', 'sold', now(), 300000, now() - interval '12 days') returning id`,
      )
    ).rows[0].id;
    await db.query(
      "insert into public.repair_jobs (item_id, partner_id, fee_paise, returned_at, outcome) values ($1, $2, 40000, now(), 'fixed')",
      [id, partner],
    );
    const m = (await q(staff, "select * from public.item_margins where item_id = $1", [id]))
      .rows[0];
    assert.equal(Number(m.cogs_paise), 100000 + 40000 + 5000);
    assert.equal(Number(m.margin_paise), 300000 - 145000);
    assert.equal(m.days_to_sell, 12);
    assert.equal(m.commission_item, false);
  });

  test("shop-listed parts show a commission, not a margin", async () => {
    const id = (
      await db.query(
        `insert into public.items (source_type, category, part_type, buy_mode, buy_paise, grade, status, sold_at, sold_paise,
                                   listed_by_partner_id, commission_pct, ownership_confirmed_at)
         values ('partner_listing', 'part', 'screen', 'free', 0, 'C', 'sold', now(), 100000, $1, 12, now()) returning id`,
        [partner],
      )
    ).rows[0].id;
    const m = (await q(staff, "select * from public.item_margins where item_id = $1", [id]))
      .rows[0];
    assert.equal(m.commission_item, true);
    assert.equal(Number(m.commission_paise), 12000);
    assert.equal(m.margin_paise, null);
  });

  test("buyers see no rows and visitors are refused", async () => {
    assert.equal((await q(buyer, "select * from public.item_margins")).rows.length, 0);
    await assert.rejects(q(null, "select * from public.item_margins"), /permission denied/);
    const opts = (await db.query("select reloptions from pg_class where relname = 'item_margins'"))
      .rows[0].reloptions;
    assert.ok(opts.includes("security_invoker=true"));
  });
});

describe("benchmarks and suggested prices", () => {
  test("benchmarks are staff-only and come from settings", async () => {
    const b = (await q(staff, "select public.pricing_benchmarks() as b")).rows[0].b;
    assert.ok("pricing.handling_paise" in b);
    assert.ok(!("pricing.target_margin_pct" in b), "there is no margin target");
    await assert.rejects(q(buyer, "select public.pricing_benchmarks()"), /Only hub staff/);
  });

  test("a suggestion uses the freshest, most specific reference and the B factor", async () => {
    await db.query(
      `insert into public.reference_prices (category, brand, model, low_paise, typical_paise, high_paise, source, checked_on)
       values ('laptop', '', '', 1000000, 1500000, 2000000, 'Market survey', current_date - 10),
              ('laptop', 'Lenovo', 'T480', 1200000, 1800000, 2200000, 'OLX listings', current_date - 5),
              ('laptop', 'Dell', 'Old', 500000, 600000, 700000, 'Too old', current_date - 400)`,
    );
    const a = (
      await q(staff, "select public.suggested_price('laptop', null, 'Lenovo', 'T480', 'A') as s")
    ).rows[0].s;
    assert.equal(Number(a.paise), 1800000);
    assert.equal(a.scope, "model");
    const b = (
      await q(staff, "select public.suggested_price('laptop', null, 'Lenovo', 'T480', 'B') as s")
    ).rows[0].s;
    assert.equal(Number(b.paise), 1350000);
    const cat = (
      await q(staff, "select public.suggested_price('laptop', null, 'Dell', 'Old', 'A') as s")
    ).rows[0].s;
    assert.equal(cat.scope, "category", "the stale model reference is skipped");
    const d = (
      await q(staff, "select public.suggested_price('laptop', null, 'Lenovo', 'T480', 'D') as s")
    ).rows[0].s;
    assert.equal(d, null);
    const none = (
      await q(staff, "select public.suggested_price('phone', null, 'X', 'Y', 'A') as s")
    ).rows[0].s;
    assert.equal(none, null);
    await assert.rejects(
      q(buyer, "select public.suggested_price('laptop', null, 'Lenovo', 'T480', 'A')"),
      /Only hub staff/,
    );
  });
});

describe("supabase-fixes/live-checks-v3.sql", () => {
  test("every check is true", async () => {
    const { rows } = await db.query(readSql("../supabase-fixes/live-checks-v3.sql"));
    assert.deepEqual(
      rows.filter((r) => !r.ok).map((r) => r.check_name),
      [],
    );
  });
});

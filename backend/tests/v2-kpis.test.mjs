import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { as, createTestDb, createUser, readSql } from "./db.mjs";

// Business Plan v2 (20261106000006): public KPIs, staff KPIs, and the v2 live checks.
let db;
let staff;
let buyer;
let partner;

before(async () => {
  db = await createTestDb();
  staff = await createUser(db, "Hub Staff", { staff: true });
  buyer = await createUser(db, "Buyer");
  partner = (
    await db.query(
      `insert into public.partners (type, name, phone, status, route_day, market)
       values ('repair_shop', 'KPI Shop', '9000000009', 'active', 'tue', 'Bahu Plaza') returning id`,
    )
  ).rows[0].id;
});

describe("supabase-fixes/live-checks-v2.sql", () => {
  test("every v2 check is true on the repo schema", async () => {
    const { rows } = await db.query(readSql("../supabase-fixes/live-checks-v2.sql"));
    assert.equal(rows.length, 11);
    assert.deepEqual(
      rows.filter((r) => !r.ok).map((r) => r.check_name),
      [],
    );
  });
});

describe("public KPIs", () => {
  test("counts and kg come from weighed records; visitors read no money", async () => {
    await as(db, staff, (tx) =>
      tx.query("select * from public.record_weighin($1, 40, 10, 0, 50, 0, '', true, false)", [
        partner,
      ]),
    );
    const k = (await as(db, null, (tx) => tx.query("select * from public.public_kpis"))).rows[0];
    assert.equal(Number(k.kg_through_hub), 100);
    assert.equal(Number(k.kg_awaiting_handover), 100);
    assert.equal(Number(k.kg_to_vrrg), 0);
    assert.ok(Number(k.partner_repair_shops) >= 1);
    await as(db, staff, (tx) =>
      tx.query("select public.record_bin_handover(array['screens','boards','other'], 'VRRG-9')"),
    );
    const after = (await as(db, null, (tx) => tx.query("select * from public.public_kpis")))
      .rows[0];
    assert.equal(Number(after.kg_to_vrrg), 100);
    assert.equal(Number(after.kg_awaiting_handover), 0);
  });

  test("institution lots count apart from the hub's own kg", async () => {
    const inst = (
      await db.query(
        "insert into public.institutions (name, type) values ('A College', 'college') returning id",
      )
    ).rows[0].id;
    const lot = (
      await as(db, staff, (tx) => tx.query("select public.open_institution_lot($1) as id", [inst]))
    ).rows[0].id;
    await as(db, staff, (tx) =>
      tx.query(`select public.record_lot_handover($1, 'V-1', '{"other": 30}')`, [lot]),
    );
    const k = (await as(db, null, (tx) => tx.query("select * from public.public_kpis"))).rows[0];
    assert.equal(Number(k.kg_to_vrrg_institution_lots), 30);
    assert.equal(Number(k.kg_to_vrrg), 100, "the hub's own line is unchanged");
    assert.equal(Number(k.kg_through_hub), 100);
  });
});

describe("staff KPIs", () => {
  test("stage gate one: 200 kg in a month with at most 4 missed pickups", async () => {
    const kpi = (who) => as(db, who, (tx) => tx.query("select public.pilot_kpis() as k"));
    await assert.rejects(kpi(buyer), /Only hub staff/);
    await assert.rejects(kpi(null), /permission denied/);
    let k = (await kpi(staff)).rows[0].k;
    assert.equal(k.kg_weighed, 100);
    assert.equal(k.gate_one_met, false);
    await as(db, staff, (tx) =>
      tx.query("select * from public.record_weighin($1, 0, 0, 0, 150, 0, '', true, false)", [
        partner,
      ]),
    );
    k = (await kpi(staff)).rows[0].k;
    assert.equal(k.kg_weighed, 250);
    assert.equal(k.gate_one_met, true);
    const sub = (
      await db.query(
        "insert into public.shop_submissions (item_name, status) values ('x', 'Accepted') returning id",
      )
    ).rows[0].id;
    await db.query(
      "insert into public.pickups (source, shop_submission_id, route_date, times_missed) values ('shop', $1, current_date, 5)",
      [sub],
    );
    k = (await kpi(staff)).rows[0].k;
    assert.equal(k.missed_pickups, 5);
    assert.equal(k.gate_one_met, false);
  });

  test("the money target is a staff-only setting, empty until a local session fills it in", async () => {
    const k = (await as(db, staff, (tx) => tx.query("select public.pilot_kpis() as k"))).rows[0].k;
    assert.equal(k.parts_target_paise, null);
    await db.query(
      "update public.app_settings set value = '1000' where key = 'finance.parts_target_monthly_paise'",
    );
    assert.equal(
      (await as(db, staff, (tx) => tx.query("select public.pilot_kpis() as k"))).rows[0].k
        .parts_target_paise,
      1000,
    );
  });

  test("the dealer self-report is staff-only and counted per month", async () => {
    await as(db, staff, (tx) =>
      tx.query(
        "insert into public.dealer_reports (partner_id, month, kg_to_other_dealers) values ($1, date_trunc('month', current_date), 3)",
        [partner],
      ),
    );
    const k = (await as(db, staff, (tx) => tx.query("select public.pilot_kpis() as k"))).rows[0].k;
    assert.equal(k.unregistered_dealer_kg, 3);
    assert.equal(k.dealer_reports, 1);
    assert.equal(
      (await as(db, buyer, (tx) => tx.query("select * from public.dealer_reports"))).rows.length,
      0,
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select * from public.dealer_reports")),
      /permission denied/,
    );
  });

  test("reuse counts A/B devices, and a C device only once a part of it is listed or sold", async () => {
    const mk = async (grade, status = "graded") =>
      (
        await db.query(
          `insert into public.items (source_type, category, buy_mode, grade, status)
           values ('repair_shop', 'monitor', 'cash', $1, $2) returning id`,
          [grade, status],
        )
      ).rows[0].id;
    const before = (await as(db, staff, (tx) => tx.query("select public.pilot_kpis() as k")))
      .rows[0].k.reuse_share;
    await mk("A");
    const c = await mk("C", "stripping");
    const mid = (await as(db, staff, (tx) => tx.query("select public.pilot_kpis() as k"))).rows[0].k
      .reuse_share;
    assert.ok(Number(mid) > 0);
    await db.query(
      `insert into public.items (source_type, category, part_type, buy_mode, parent_id, grade, status, sold_at, sold_paise)
       values ('stripped', 'part', 'screen', 'free', $1, 'C', 'sold', now(), 100)`,
      [c],
    );
    const after = (await as(db, staff, (tx) => tx.query("select public.pilot_kpis() as k"))).rows[0]
      .k.reuse_share;
    assert.ok(Number(after) > Number(mid), `${before} < ${mid} < ${after}`);
  });

  test("weekly price cuts and hub badges are staff-only", async () => {
    const cuts = await as(db, staff, (tx) => tx.query("select * from public.weekly_price_cuts()"));
    assert.ok(Array.isArray(cuts.rows));
    await assert.rejects(
      as(db, buyer, (tx) => tx.query("select * from public.weekly_price_cuts()")),
      /Only hub staff/,
    );
    const b = (await as(db, staff, (tx) => tx.query("select public.hub_badges() as b"))).rows[0].b;
    assert.equal(typeof b.part_listings_waiting, "number");
    assert.equal(typeof b.bins_due, "number");
  });
});

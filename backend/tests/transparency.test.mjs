import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { as, createTestDb, createUser } from "./db.mjs";

// Batch 24 (20261107000006): public ledger, monthly reports and the activity feed.
let db;
let staff;
let partner;
const q = (who, sql, params) => as(db, who, (tx) => tx.query(sql, params));

before(async () => {
  db = await createTestDb({ seed: false });
  staff = await createUser(db, "Ledger Staff", { staff: true });
  partner = (
    await db.query(
      `insert into public.partners (type, name, phone, status, route_day, market)
       values ('repair_shop', 'Ledger Shop', '9000000005', 'active', 'tue', 'Bahu Plaza') returning id`,
    )
  ).rows[0].id;
});

describe("public_ledger", () => {
  test("hub handovers show the receipt; institution lots are unnamed unless they opted in", async () => {
    await q(staff, "select * from public.record_weighin($1, 10, 5, 2, 20, 0, '', true, false)", [
      partner,
    ]);
    await q(
      staff,
      "select public.record_bin_handover(array['screens','boards','other','batteries'], 'VRRG-L1', null, '{\"screens\": 900}')",
    );
    const inst = (
      await db.query(
        "insert into public.institutions (name, type) values ('Secret School', 'school') returning id",
      )
    ).rows[0].id;
    const lot = (await q(staff, "select public.open_institution_lot($1) as id", [inst])).rows[0].id;
    await q(staff, "select public.record_lot_handover($1, 'VRRG-L2', '{\"other\": 40}')", [lot]);
    let rows = (await q(null, "select * from public.public_ledger order by total_kg")).rows;
    const hub = rows.find((r) => r.source === "ReLoop hub");
    assert.equal(hub.receipt_ref, "VRRG-L1");
    assert.equal(Number(hub.total_kg), 37);
    assert.equal(Number(hub.batteries_kg), 2);
    const lotRow = rows.find((r) => r.source === "Institution lot");
    assert.equal(lotRow.institution, null);
    assert.equal(lotRow.receipt_ref, null);
    assert.ok(!JSON.stringify(rows).includes("Secret School"));
    assert.ok(!JSON.stringify(rows).includes("900"), "VRRG rates never appear");
    await db.query(
      "update public.institutions set named_publicly = true, named_consent_at = now() where id = $1",
      [inst],
    );
    rows = (await q(null, "select * from public.public_ledger")).rows;
    assert.equal(rows.find((r) => r.source === "Institution lot").institution, "Secret School");
  });
});

describe("public_monthly_reports", () => {
  test("a month's kg weighed, kg to VRRG and counts add up", async () => {
    const rows = (await q(null, "select * from public.public_monthly_reports")).rows;
    const now = rows.find((r) => Number(r.weighins) > 0);
    assert.equal(Number(now.kg_weighed), 37);
    assert.equal(Number(now.kg_to_vrrg), 77);
    assert.ok(Number(now.institution_lots) >= 1);
    assert.ok(Number(now.partner_shops) >= 1);
    const cols = Object.keys(now);
    assert.ok(!cols.some((c) => /paise|name|phone/.test(c)));
  });
});

describe("activity_feed", () => {
  test("stays empty below 5 events in 30 days, and never shows events under a day old", async () => {
    assert.equal(
      (await q(null, "select * from public.activity_feed")).rows.length,
      0,
      "everything is fresh",
    );
    await db.query("update public.scrap_weighins set weighed_at = now() - interval '2 days'");
    assert.equal(
      (await q(null, "select * from public.activity_feed")).rows.length,
      0,
      "1 aged event is too few",
    );
    for (let i = 0; i < 4; i++)
      await db.query(
        `insert into public.items (source_type, category, buy_mode, grade, status, listed_at, current_paise, list_paise, inspection, inspected_at)
         values ('repair_shop', 'monitor', 'cash', 'A', 'listed', now() - interval '3 days', 100000, 100000, '{"version":1,"checks":{}}', now())`,
      );
    const feed = (await q(null, "select * from public.activity_feed")).rows;
    assert.ok(feed.length >= 5);
    const w = feed.find((r) => r.kind === "weighin");
    assert.equal(w.place, "Other Jammu markets", "one shop in Bahu Plaza is merged");
    assert.equal(w.who, "Repair shops");
    assert.deepEqual(Object.keys(feed[0]), ["day", "kind", "category", "place", "who"]);
  });
});

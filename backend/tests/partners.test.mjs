import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { ADMIN_ID, as, createTestDb, createUser } from "./db.mjs";

// Batch 23 (20261107000005): the partner directory and the shop's own dashboard.
let db;
let staff;
let owner;
let partner;
let other;
const q = (who, sql, params) => as(db, who, (tx) => tx.query(sql, params));

before(async () => {
  db = await createTestDb();
  staff = await createUser(db, "Dir Staff", { staff: true });
  owner = await createUser(db, "Dir Owner", {
    meta: { account_type: "shop_owner", shop_name: "Dir Mobiles", business_address: "Bahu Plaza" },
  });
  partner = (
    await db.query(
      `insert into public.partners (type, name, owner, phone, status, route_day, market, shop_owner_id)
       values ('repair_shop', 'Dir Mobiles', 'Private Owner', '9000000003', 'active', 'tue', 'Bahu Plaza', $1) returning id`,
      [owner],
    )
  ).rows[0].id;
  other = (
    await db.query(
      `insert into public.partners (type, name, phone, status, route_day, market)
       values ('retailer', 'Quiet Store', '9000000004', 'active', 'tue', 'Gole Market') returning id`,
    )
  ).rows[0].id;
});

describe("partner_directory", () => {
  test("only shops an admin switched in, with consent, appear; kg is a band", async () => {
    assert.equal((await q(null, "select * from public.partner_directory")).rows.length, 0);
    await assert.rejects(
      q(staff, "select public.set_partner_directory($1, true)", [partner]),
      /Only admins/,
    );
    await q(ADMIN_ID, "select public.set_partner_directory($1, true)", [partner]);
    let rows = (await q(null, "select * from public.partner_directory")).rows;
    assert.deepEqual(
      rows.map((r) => r.name),
      ["Dir Mobiles"],
    );
    assert.equal(rows[0].kg_band, "under 25 kg");
    assert.equal(rows[0].type, "Repair shop");
    await q(staff, "select * from public.record_weighin($1, 20, 10, 0, 0, 0, '', true, false)", [
      partner,
    ]);
    rows = (await q(null, "select * from public.partner_directory")).rows;
    assert.equal(rows[0].kg_band, "25-100 kg");
    const cols = (await q(null, "select * from public.partner_directory limit 1")).fields.map(
      (f) => f.name,
    );
    assert.deepEqual(cols, ["name", "market", "type", "partner_since", "kg_band"]);
  });

  test("consent is required, recorded, and switching off hides the shop", async () => {
    await assert.rejects(
      db.query(
        "update public.partners set show_in_directory = true, directory_consent_at = null where id = $1",
        [other],
      ),
      /partners_directory_needs_consent/,
    );
    const at = (
      await db.query("select directory_consent_at from public.partners where id = $1", [partner])
    ).rows[0];
    assert.ok(at.directory_consent_at);
    await q(ADMIN_ID, "select public.set_partner_directory($1, false)", [partner]);
    assert.equal((await q(null, "select * from public.partner_directory")).rows.length, 0);
    await q(ADMIN_ID, "select public.set_partner_directory($1, true)", [partner]);
  });

  test("visitors cannot read partners behind the view", async () => {
    await assert.rejects(q(null, "select * from public.partners"), /permission denied/);
  });
});

describe("my_partner_dashboard", () => {
  test("the shop sees its own exact kg, items, estimate and payouts", async () => {
    await db.query(
      `insert into public.items (source_type, partner_id, category, buy_mode, grade, status, weight_kg)
       values ('repair_shop', $1, 'monitor', 'cash', 'B', 'graded', 4.5),
              ('repair_shop', $1, 'phone', 'cash', 'A', 'graded', null)`,
      [partner],
    );
    const d = (await q(owner, "select public.my_partner_dashboard() as d")).rows[0].d;
    assert.equal(Number(d.kg_weighed), 30);
    assert.equal(d.weighins, 1);
    assert.equal(d.items_bought, 2);
    assert.equal(Number(d.kg_items_measured), 4.5);
    assert.ok(Number(d.kg_items_estimated) > 0, "the phone's weight is an estimate");
    assert.ok(Number(d.paid_out_paise) > 0, "the weigh-in was paid");
    assert.equal(d.in_directory, true);
  });

  test("someone else gets their own (empty) numbers, and visitors are refused", async () => {
    const stranger = await createUser(db, "Dir Stranger");
    const d = (await q(stranger, "select public.my_partner_dashboard() as d")).rows[0].d;
    assert.equal(d.weighins, 0);
    assert.equal(Number(d.kg_weighed), 0);
    await assert.rejects(q(null, "select public.my_partner_dashboard()"));
  });
});

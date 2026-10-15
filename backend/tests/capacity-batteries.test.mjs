import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { ADMIN_ID, as, createTestDb, createUser } from "./db.mjs";

// Batch 21 (20261107000003): battery ledger, capacity status and the handover record.
let db;
let staff;
let buyer;
const q = (who, sql, params) => as(db, who, (tx) => tx.query(sql, params));
const cap = async () => (await q(staff, "select public.capacity_status() as c")).rows[0].c;

before(async () => {
  db = await createTestDb();
  staff = await createUser(db, "Cap Staff", { staff: true });
  buyer = await createUser(db, "Cap Buyer");
});

describe("battery ledger", () => {
  test("logging batteries needs kg, a count and a condition, and staff", async () => {
    await assert.rejects(q(staff, "select public.log_battery(0, 2, 'good')"), /weight/);
    await assert.rejects(q(staff, "select public.log_battery(1, 0, 'good')"), /how many/);
    await assert.rejects(q(staff, "select public.log_battery(1, 2, 'melted')"), /Condition/);
    await assert.rejects(q(buyer, "select public.log_battery(1, 2, 'good')"), /Only hub staff/);
    const id = (
      await q(staff, "select public.log_battery(1.5, 3, 'swollen', 'from a stripped phone') as id")
    ).rows[0].id;
    const row = (
      await db.query(
        "select bin, kg, source, battery_count, battery_condition from public.scrap_ledger where id = $1",
        [id],
      )
    ).rows[0];
    assert.deepEqual(
      { ...row, kg: Number(row.kg) },
      {
        bin: "batteries",
        kg: 1.5,
        source: "battery_removed",
        battery_count: 3,
        battery_condition: "swollen",
      },
    );
    const c = await cap();
    assert.equal(Number(c.battery.kg), 1.5);
    assert.equal(Number(c.battery.count), 3);
  });

  test("battery fields belong to the battery bin only", async () => {
    await assert.rejects(
      db.query(
        "insert into public.scrap_ledger (bin, kg, source, battery_count) values ('screens', 1, 'device_d', 2)",
      ),
      /scrap_ledger_battery_fields/,
    );
  });

  test("a reused battery leaves the cabinet, the ledger keeps both lines, and a handover skips nothing else", async () => {
    const id = (await q(staff, "select public.log_battery(2, 1, 'good') as id")).rows[0].id;
    const before = Number((await cap()).battery.kg);
    await assert.rejects(q(staff, "select public.mark_battery_reused($1, '')", [id]), /Say where/);
    await q(staff, "select public.mark_battery_reused($1, 'fitted in RL-JMU-0042')", [id]);
    assert.equal(Number((await cap()).battery.kg), before - 2);
    await assert.rejects(
      q(staff, "select public.mark_battery_reused($1, 'again')", [id]),
      /already marked reused/,
    );
    const lines = (
      await db.query(
        "select kg, reused, source from public.scrap_ledger where bin = 'batteries' and (id = $1 or note like 'Reused:%')",
        [id],
      )
    ).rows;
    assert.equal(lines.length, 2);
    assert.ok(lines.every((l) => l.reused));
    // The remaining cabinet weight goes in a battery handover as a whole.
    await q(staff, "select public.record_bin_handover(array['batteries'], 'VRRG-BAT-1')");
    const h = (
      await db.query("select battery_kg from public.handovers where receipt_no = 'VRRG-BAT-1'")
    ).rows[0];
    assert.equal(Number(h.battery_kg), 1.5);
    assert.equal(Number((await cap()).battery.kg), 0);
  });
});

describe("capacity_status", () => {
  test("racks have no percentage or alert while the slots setting is unset", async () => {
    await db.query("delete from public.app_settings where key = 'capacity.device_rack_slots'");
    const c = await cap();
    assert.equal(c.device_rack.slots, null);
    assert.equal(c.device_rack.pct, null);
    assert.equal(c.device_rack.alert, null);
  });

  test("with slots set, the rack alerts from 80% and counts only devices at the hub", async () => {
    const mk = (category, status, extra = "") =>
      db.query(
        `insert into public.items (source_type, category, buy_mode, status ${extra ? ", " + extra.split("=")[0] : ""})
         values ('repair_shop', $1, 'cash', $2 ${extra ? ", " + extra.split("=")[1] : ""})`,
        [category, status],
      );
    const base = (await cap()).device_rack.used;
    for (let i = 0; i < 4; i++) await mk("monitor", "received");
    await mk("monitor", "sold").catch(() => {});
    await db.query(
      `insert into public.app_settings (key, value, is_public) values ('capacity.device_rack_slots', to_jsonb(${base + 5}), false)
       on conflict (key) do update set value = excluded.value`,
    );
    let c = await cap();
    assert.equal(c.device_rack.used, base + 4);
    assert.equal(c.device_rack.alert, true, "4 of 5 new slots is 80%+ of the total");
    await db.query(
      "update public.app_settings set value = to_jsonb(500) where key = 'capacity.device_rack_slots'",
    );
    c = await cap();
    assert.equal(c.device_rack.alert, false);
    assert.equal(c.device_rack.pct, Math.round(((base + 4) * 100) / 500));
  });

  test("parts are a count, and ages fall into the bands", async () => {
    await db.query(
      `insert into public.items (source_type, category, part_type, buy_mode, grade, status, received_at)
       values ('stripped', 'part', 'screen', 'free', 'C', 'graded', now()),
              ('stripped', 'part', 'screen', 'free', 'C', 'graded', now() - interval '40 days')`,
    );
    await db.query(
      `insert into public.items (source_type, category, buy_mode, status, received_at)
       values ('repair_shop', 'monitor', 'cash', 'received', now() - interval '40 days'),
              ('repair_shop', 'monitor', 'cash', 'received', now() - interval '60 days')`,
    );
    const c = await cap();
    assert.ok(c.parts_shelf.count >= 2);
    assert.ok(c.ages.parts.d0_30 >= 1 && c.ages.parts.d31_plus >= 1);
    assert.ok(c.ages.devices.d31_45 >= 1 && c.ages.devices.d46_plus >= 1);
    assert.equal(c.bins.length, 5);
  });

  test("the battery reminder fires a week after the last handover or the oldest entry", async () => {
    await q(staff, "select public.log_battery(1, 1, 'used')");
    assert.equal((await cap()).battery.reminder, false);
    await db.query(
      "update public.scrap_ledger set at = now() - interval '8 days' where bin = 'batteries' and handover_id is null",
    );
    await db.query("update public.handovers set date = date - 8 where battery_kg > 0");
    assert.equal((await cap()).battery.reminder, true);
  });

  test("capacity is staff-only", async () => {
    await assert.rejects(q(buyer, "select public.capacity_status()"), /Only hub staff/);
    await assert.rejects(q(null, "select public.capacity_status()"));
  });
});

describe("handover_record", () => {
  test("lists what was bought by tag and the partner's weight receipt in the institution's name", async () => {
    const inst = (
      await db.query(
        "insert into public.institutions (name, type) values ('GGM Science College', 'college') returning id",
      )
    ).rows[0].id;
    const lot = (await q(staff, "select public.open_institution_lot($1) as id", [inst])).rows[0].id;
    await db.query(
      `insert into public.items (source_type, institution_id, category, brand, model, buy_mode, grade, status, institution_lot_id)
       values ('institution', $1, 'monitor', 'Dell', 'E2216', 'cash', 'B', 'graded', $2)`,
      [inst, lot],
    );
    let rec = (await q(staff, "select public.handover_record($1) as r", [lot])).rows[0].r;
    assert.equal(rec.institution, "GGM Science College");
    assert.equal(rec.bought_items.length, 1);
    assert.equal(rec.bought_items[0].brand, "Dell");
    assert.equal(rec.dismantler, null);
    await q(
      staff,
      "select public.record_lot_handover($1, 'VRRG-77', '{\"screens\": 12, \"other\": 30}')",
      [lot],
    );
    rec = (await q(staff, "select public.handover_record($1) as r", [lot])).rows[0].r;
    assert.equal(rec.dismantler, "VRRG Group");
    assert.equal(rec.dismantler_receipt_no, "VRRG-77");
    assert.deepEqual(rec.kg_by_category, { screens: 12, other: 30 });
    assert.ok(!JSON.stringify(rec).match(/paise|price|fee/i), "no money in the record");
    await assert.rejects(q(buyer, "select public.handover_record($1)", [lot]), /Only hub staff/);
  });
});

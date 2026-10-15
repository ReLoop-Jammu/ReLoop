import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { as, createTestDb, createUser } from "./db.mjs";

// Business Plan v2, step 2 (20261106000002-3): weigh-ins, bins, handovers, receipts,
// institution lots, ownership and wipe-before-strip.
let db;
let staff;
let buyer;
let owner;
let partner;

const weigh = (who, p, args = {}) => {
  const a = {
    screens: 2,
    boards: 1,
    batteries: 0.5,
    other: 10,
    toTest: 0,
    owns: true,
    swap: false,
    method: "upi",
    ...args,
  };
  return as(db, who, (tx) =>
    tx.query("select * from public.record_weighin($1, $2, $3, $4, $5, $6, '', $7, $8, $9, '')", [
      p,
      a.screens,
      a.boards,
      a.batteries,
      a.other,
      a.toTest,
      a.owns,
      a.swap,
      a.method,
    ]),
  );
};
const bins = async () =>
  Object.fromEntries(
    (await as(db, staff, (tx) => tx.query("select * from public.bin_status()"))).rows.map((r) => [
      r.bin,
      r,
    ]),
  );
const newPartner = async (name, extra = {}) =>
  (
    await db.query(
      `insert into public.partners (type, name, phone, status, route_day, market, shop_owner_id)
       values ('repair_shop', $1, '9000000001', $2, 'tue', 'Bahu Plaza', $3) returning id`,
      [name, extra.status ?? "active", extra.owner ?? null],
    )
  ).rows[0].id;

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
  partner = await newPartner("Sharma Mobiles", { owner });
});

describe("weigh-ins", () => {
  test("pays the counter weight by the rate card, snapshots the rates and fills the bins", async () => {
    const { rows } = await weigh(staff, partner);
    // 2 kg screens + 1 kg boards + 0.5 kg batteries + 10 kg other, at the rate card.
    assert.equal(Number(rows[0].amount_paise), 2 * 17000 + 13000 + 0.5 * 80000 + 10 * 500);
    assert.match(rows[0].receipt_no, /^RL-PAY-\d{4}-\d{4}$/);
    assert.match(rows[0].receipt_token, /^[0-9a-f]{32}$/);
    const w = (await db.query("select * from public.scrap_weighins")).rows[0];
    assert.deepEqual(w.rates_paise, {
      screens: 17000,
      batteries: 80000,
      boards: 13000,
      other: 500,
    });
    const b = await bins();
    assert.equal(Number(b.screens.kg), 2);
    assert.equal(Number(b.boards.kg), 1);
    assert.equal(Number(b.batteries.kg), 0.5);
    assert.equal(Number(b.other.kg), 10);
    assert.equal(b.d_devices.due, false);
  });

  test("a later rate change does not touch earlier weigh-ins", async () => {
    await db.query(
      "update public.app_settings set value = '99999' where key = 'rate_card.screens_paise'",
    );
    const first = (
      await db.query("select rates_paise from public.scrap_weighins order by weighed_at limit 1")
    ).rows[0];
    assert.equal(first.rates_paise.screens, 17000);
    const { rows } = await weigh(staff, partner, { screens: 1, boards: 0, batteries: 0, other: 0 });
    assert.equal(Number(rows[0].amount_paise), 99999);
    await db.query(
      "update public.app_settings set value = '17000' where key = 'rate_card.screens_paise'",
    );
  });

  test("refuses without the ownership tick, for paused partners, for buyers and bad weights", async () => {
    await assert.rejects(weigh(staff, partner, { owns: false }), /theirs to sell/);
    await assert.rejects(weigh(staff, partner, { toTest: 2, swap: false }), /may sell the parts/);
    const paused = await newPartner("Paused Shop", { status: "paused" });
    await assert.rejects(weigh(staff, paused), /Only active partners/);
    await assert.rejects(weigh(buyer, partner), /Only hub staff/);
    await assert.rejects(weigh(null, partner), /permission denied/);
    await assert.rejects(weigh(staff, partner, { screens: -1 }), /between 0 and 5000/);
    await assert.rejects(
      weigh(staff, partner, { screens: 0, boards: 0, batteries: 0, other: 0 }),
      /weighin_has_something/,
    );
  });

  test("a bag to test with no scrap needs no payment; no money is recorded for it", async () => {
    const { rows } = await weigh(staff, partner, {
      screens: 0,
      boards: 0,
      batteries: 0,
      other: 0,
      toTest: 3,
      swap: true,
    });
    assert.equal(Number(rows[0].amount_paise), 0);
    assert.equal(rows[0].receipt_no, null);
  });

  test("the weigh-in is staff-only; the shop sees its own through my_weighins", async () => {
    assert.equal(
      (await as(db, buyer, (tx) => tx.query("select * from public.scrap_weighins"))).rows.length,
      0,
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select * from public.scrap_ledger")),
      /permission denied/,
    );
    const mine = await as(db, owner, (tx) => tx.query("select * from public.my_weighins()"));
    assert.ok(mine.rows.length >= 2);
    assert.ok(!("rates_paise" in mine.rows[0]));
    assert.equal(
      (await as(db, buyer, (tx) => tx.query("select * from public.my_weighins()"))).rows.length,
      0,
    );
  });
});

describe("receipts", () => {
  test("anyone holding the token reads the receipt; it shows kg, rates and amounts, never staff fields", async () => {
    const { rows: p } = await db.query(
      "select receipt_token, receipt_no from public.payouts where line = 'scrap' limit 1",
    );
    const r = await as(db, null, (tx) =>
      tx.query("select * from public.receipt_by_token($1)", [p[0].receipt_token]),
    );
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0].shop_name, "Sharma Mobiles");
    assert.ok(Array.isArray(r.rows[0].lines) && r.rows[0].lines.length >= 1);
    assert.deepEqual(Object.keys(r.rows[0]).sort(), [
      "amount_paise",
      "declaration",
      "line",
      "lines",
      "method",
      "paid_at",
      "receipt_no",
      "shop_name",
    ]);
    assert.match(r.rows[0].declaration, /theirs to sell/);
    const none = await as(db, null, (tx) =>
      tx.query("select * from public.receipt_by_token('0123456789abcdef0123456789abcdef')"),
    );
    assert.equal(none.rows.length, 0);
    const bad = await as(db, null, (tx) => tx.query("select * from public.receipt_by_token('x')"));
    assert.equal(bad.rows.length, 0);
    await assert.rejects(
      as(db, null, (tx) => tx.query("select * from public.payouts")),
      /permission denied/,
    );
  });

  test("the shop sees its payouts with the receipt token; staff see any receipt as data", async () => {
    const mine = await as(db, owner, (tx) => tx.query("select * from public.my_payouts()"));
    assert.ok(mine.rows.length >= 1 && mine.rows.every((r) => r.line === "scrap"));
    const no = mine.rows[0].receipt_no;
    const asStaff = await as(db, staff, (tx) =>
      tx.query("select * from public.payout_receipt($1)", [no]),
    );
    assert.equal(asStaff.rows.length, 1);
    const other = await as(db, buyer, (tx) =>
      tx.query("select * from public.payout_receipt($1)", [no]),
    );
    assert.equal(other.rows.length, 0);
  });

  test("a payout has exactly one source", async () => {
    await assert.rejects(
      db.query(
        `insert into public.payouts (receipt_no, amount_paise, method, paid_at) values ('RL-PAY-2026-9001', 1, 'upi', current_date)`,
      ),
      /payouts_one_source/,
    );
    const w = (await db.query("select id from public.scrap_weighins limit 1")).rows[0].id;
    const sub = (
      await db.query(
        "insert into public.shop_submissions (item_name, status) values ('x', 'Purchased') returning id",
      )
    ).rows[0].id;
    await assert.rejects(
      db.query(
        `insert into public.payouts (receipt_no, weighin_id, shop_submission_id, amount_paise, method, paid_at, line)
         values ('RL-PAY-2026-9002', $1, $2, 1, 'upi', current_date, 'part_sale')`,
        [w, sub],
      ),
      /payouts_one_source/,
    );
  });
});

describe("bins and handovers", () => {
  test("a tagged D device adds its weight (estimated if unmeasured) and leaves with its handover", async () => {
    const mk = async (fields) =>
      (
        await as(db, staff, (tx) =>
          tx.query(
            `insert into public.items (source_type, category, buy_mode, grade, status, weight_kg, inspection, inspected_at)
             values ('repair_shop', 'laptop', 'cash', 'D', 'in_scrap_cage', $1, null, null) returning id`,
            [fields.kg],
          ),
        )
      ).rows[0].id;
    const measured = await mk({ kg: 2.5 });
    const unmeasured = await mk({ kg: null });
    const rows = (
      await db.query(
        "select item_id, kg, estimated from public.scrap_ledger where bin = 'd_devices' order by id",
      )
    ).rows;
    assert.deepEqual(
      rows.map((r) => [r.item_id, Number(r.kg), r.estimated]),
      [
        [measured, 2.5, false],
        [unmeasured, 2.2, true],
      ],
    );
    await db.query("update public.items set status = 'graded', grade = 'C' where id = $1", [
      unmeasured,
    ]);
    assert.equal(
      (await db.query("select count(*)::int n from public.scrap_ledger where bin = 'd_devices'"))
        .rows[0].n,
      1,
    );
  });

  test("a bin is due at 100 kg or 14 days; batteries at 7 days whatever the weight", async () => {
    await db
      .query(
        "insert into public.scrap_ledger (bin, kg, source) values ('boards', 90, 'adjustment')",
      )
      .catch(() => {});
    await db.query(
      "insert into public.scrap_ledger (bin, kg, source, note) values ('boards', 90, 'adjustment', 'test')",
    );
    let b = await bins();
    assert.equal(b.boards.near_limit, true);
    assert.equal(b.boards.due, false);
    await db.query(
      "insert into public.scrap_ledger (bin, kg, source, note) values ('boards', 10, 'adjustment', 'test')",
    );
    assert.equal((await bins()).boards.due, true);
    await db.query(
      "update public.scrap_ledger set at = now() - interval '15 days' where bin = 'other'",
    );
    assert.equal((await bins()).other.due, true, "14 days");
    assert.equal((await bins()).screens.due, false);
    await db.query(
      "update public.scrap_ledger set at = now() - interval '8 days' where bin = 'batteries'",
    );
    b = await bins();
    assert.equal(b.batteries.due, true);
    assert.equal(b.batteries.near_limit, false);
  });

  test("a correction needs a note", async () => {
    await assert.rejects(
      db.query("insert into public.scrap_ledger (bin, kg, source) values ('other', -1, 'reweigh')"),
      /ledger_note_for_corrections/,
    );
    await db.query(
      "insert into public.scrap_ledger (bin, kg, source, note) values ('other', -0.5, 'reweigh', 'hub re-weigh')",
    );
  });

  test("a handover takes whole bins, names the partner, stores staff-only rates and empties them", async () => {
    const run = (who, bs, rates = null) =>
      as(db, who, (tx) =>
        tx.query("select public.record_bin_handover($1, $2, null, $3, '') as id", [
          bs,
          "VRRG-0001",
          rates,
        ]),
      );
    await assert.rejects(run(buyer, ["boards"]), /Only hub staff/);
    await assert.rejects(run(staff, ["bogus"]), /Choose bins/);
    const id = (await run(staff, ["boards", "batteries", "d_devices"], { boards: 1 })).rows[0].id;
    const h = (await db.query("select * from public.handovers where id = $1", [id])).rows[0];
    assert.equal(h.recycler, "VRRG Group, Gangyal");
    assert.equal(Number(h.kg_by_category.boards), 101);
    assert.equal(Number(h.battery_kg), 0.5);
    assert.equal(h.kind, "hub");
    assert.equal(h.item_ids.length, 1);
    const b = await bins();
    assert.equal(Number(b.boards.kg), 0);
    assert.equal(Number(b.batteries.kg), 0);
    assert.equal(Number(b.d_devices.kg), 0);
    await assert.rejects(run(staff, ["boards"]), /empty/);
    const st = await db.query("select status from public.items where id = any($1)", [h.item_ids]);
    assert.equal(st.rows[0].status, "handed_over");
    await assert.rejects(
      as(db, null, (tx) => tx.query("select rates_paise from public.handovers")),
      /permission denied/,
    );
  });
});

describe("tested parts, paid as parts", () => {
  test("each tested part is tagged to the weigh-in and paid on its own receipt line", async () => {
    const w = (await db.query("select id from public.scrap_weighins where to_test_count = 3"))
      .rows[0].id;
    const part = (price) =>
      as(db, staff, (tx) =>
        tx.query(
          `insert into public.items (source_type, category, part_type, buy_mode, buy_paise, weighin_id, ownership_confirmed_at)
           values ('repair_shop', 'part', 'board', 'cash', $1, $2, now()) returning id, wipe_required`,
          [price, w],
        ),
      ).then((r) => r.rows[0]);
    const a = await part(250000);
    assert.equal(a.wipe_required, true, "a board pulled from scrap is wiped before listing");
    const b = await part(0);
    const run = (ids) =>
      as(db, staff, (tx) => tx.query("select * from public.pay_tested_parts($1, $2)", [w, ids]));
    await assert.rejects(run([a.id, b.id]), /part price/);
    const ok = await run([a.id]);
    assert.equal(Number(ok.rows[0].amount_paise), 250000);
    await assert.rejects(run([a.id]), /already paid/);
    const lines = await as(db, null, (tx) =>
      tx.query("select lines from public.receipt_by_token($1)", [ok.rows[0].receipt_token]),
    );
    assert.equal(lines.rows[0].lines[0].amount_paise, 250000);
  });
});

describe("institution lots", () => {
  test("a lot carries the published fee on its own receipt; dead e-waste is a handover outside the bins", async () => {
    const inst = (
      await db.query(
        "insert into public.institutions (name, type) values ('Govt Polytechnic', 'college') returning id",
      )
    ).rows[0].id;
    const before = await bins();
    const lot = (
      await as(db, staff, (tx) => tx.query("select public.open_institution_lot($1) as id", [inst]))
    ).rows[0].id;
    const l = (await db.query("select * from public.institution_lots where id = $1", [lot]))
      .rows[0];
    assert.equal(Number(l.fee_paise), 300000);
    const r1 = (
      await as(db, staff, (tx) => tx.query("select public.record_lot_fee($1, 'upi') as n", [lot]))
    ).rows[0].n;
    assert.match(r1, /^RL-FEE-\d{4}-0001$/);
    await assert.rejects(
      as(db, staff, (tx) => tx.query("select public.record_lot_fee($1, 'upi')", [lot])),
      /already recorded/,
    );
    await assert.rejects(
      as(db, staff, (tx) => tx.query("select public.record_lot_fee($1, 'bitcoin')", [lot])),
      /cash or UPI/,
    );
    const h = (
      await as(db, staff, (tx) =>
        tx.query(
          `select public.record_lot_handover($1, 'VRRG-INST-1', '{"screens": 12, "boards": 20}') as id`,
          [lot],
        ),
      )
    ).rows[0].id;
    const row = (await db.query("select * from public.handovers where id = $1", [h])).rows[0];
    assert.equal(row.on_behalf_of, "Govt Polytechnic");
    assert.equal(row.kind, "institution_lot");
    const after = await bins();
    assert.equal(Number(after.screens.kg), Number(before.screens.kg), "the bins are untouched");
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query(`select public.record_lot_handover($1, 'X', '{"other": 1}')`, [lot]),
      ),
      /already has a handover/,
    );
    assert.equal(
      (await as(db, buyer, (tx) => tx.query("select * from public.institution_lots"))).rows.length,
      0,
    );
  });
});

describe("ownership and wipe before stripping", () => {
  const intake = (fields = {}) => {
    const f = { source_type: "repair_shop", category: "phone", buy_mode: "cash", ...fields };
    const cols = Object.keys(f);
    return as(db, staff, (tx) =>
      tx.query(
        `insert into public.items (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning *`,
        Object.values(f),
      ),
    );
  };

  test("until the cutoff is set nothing is enforced; after it a device needs the seller's tick", async () => {
    await intake();
    await db.query(
      "update public.app_settings set value = '\"2026-01-01\"' where key = 'ownership.required_from'",
    );
    await assert.rejects(intake(), /confirm they own the device/);
    const ok = await intake({ ownership_confirmed_at: new Date().toISOString() });
    assert.ok(ok.rows[0].ownership_confirmed_by, "the staff member present is recorded");
    await intake({ source_type: "stripped", category: "part", part_type: "screen" });
    await db.query(
      "update public.app_settings set value = 'null' where key = 'ownership.required_from'",
    );
  });

  test("convert_submission records the declaration with the tags and the staff member", async () => {
    const sub = (
      await db.query(
        `insert into public.shop_submissions (shop_owner_id, item_name, quantity, condition, status)
         values ($1, 'Phones', 2, 'Used', 'Accepted') returning id`,
        [owner],
      )
    ).rows[0].id;
    await db.query(
      "update public.app_settings set value = '\"2026-01-01\"' where key = 'ownership.required_from'",
    );
    const conv = (confirmed) =>
      as(db, staff, (tx) =>
        tx.query("select public.convert_submission($1, 'phone', null, 50000, $2) as t", [
          sub,
          confirmed,
        ]),
      );
    await assert.rejects(conv(false), /confirm they own the device/);
    const tags = (await conv(true)).rows[0].t;
    assert.equal(tags.length, 2);
    const d = (
      await db.query("select * from public.ownership_declarations where shop_submission_id = $1", [
        sub,
      ])
    ).rows[0];
    assert.deepEqual(d.tags, tags);
    assert.equal(d.seller_label, "Sharma Mobiles");
    assert.ok(d.staff_id);
    await db.query(
      "update public.app_settings set value = 'null' where key = 'ownership.required_from'",
    );
  });

  test("a locked device is only ever C or D", async () => {
    await assert.rejects(intake({ locked_device: true, grade: "A" }), /locked_never_resold_whole/);
    await intake({ locked_device: true, grade: "C" });
  });

  test("a device must be wiped before it is stripped; older rows are exempt", async () => {
    await db.query(
      "update public.app_settings set value = '\"2026-01-01\"' where key = 'wipe.strip_required_from'",
    );
    const dev = (await intake({ grade: "C" })).rows[0];
    const strip = () =>
      as(db, staff, (tx) =>
        tx.query("update public.items set status = 'stripping' where id = $1", [dev.id]),
      );
    await assert.rejects(strip(), /Wipe the device/);
    await assert.rejects(
      intake({ category: "part", part_type: "board", parent_id: dev.id, source_type: "stripped" }),
      /Wipe the device/,
    );
    await db.query(
      "update public.items set wiped_at = now(), wipe_method = 'reset_overwrite' where id = $1",
      [dev.id],
    );
    await strip();
    const old = (await intake({ grade: "C" })).rows[0];
    await db.query("update public.items set received_at = '2025-06-01' where id = $1", [old.id]);
    await as(db, staff, (tx) =>
      tx.query("update public.items set status = 'stripping' where id = $1", [old.id]),
    );
    await db.query(
      "update public.app_settings set value = 'null' where key = 'wipe.strip_required_from'",
    );
  });

  test("boards need a wipe unless pulled from a monitor; a destroyed chip is never listed", async () => {
    const board = (await intake({ category: "part", part_type: "board" })).rows[0];
    assert.equal(board.wipe_required, true);
    const mon = (await intake({ category: "monitor" })).rows[0];
    const fromMon = (
      await intake({
        category: "part",
        part_type: "board",
        parent_id: mon.id,
        source_type: "stripped",
      })
    ).rows[0];
    assert.equal(fromMon.wipe_required, false);
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query(
          `update public.items set wipe_method = 'drilled', wiped_at = now(), grade = 'C', status = 'listed',
                  current_paise = 10000, listed_at = now(), inspection = '{"version":1,"checks":{}}', inspected_at = now()
            where id = $1`,
          [board.id],
        ),
      ),
      /destroyed_storage_not_listed/,
    );
  });

  test("new part types exist for cameras and charging ports", async () => {
    await intake({ category: "part", part_type: "camera" });
    await intake({ category: "part", part_type: "charging_port" });
  });
});

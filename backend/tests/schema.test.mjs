import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { ADMIN_ID, as, createTestDb, createUser } from "./db.mjs";

let db;
let staff; // hub staff member
let member; // signed-in, but not staff

async function intake(tx, fields = {}) {
  const f = {
    source_type: "repair_shop",
    category: "phone",
    buy_mode: "cash",
    brand: "Samsung",
    model: "M31",
    ...fields,
  };
  const cols = Object.keys(f);
  const { rows } = await tx.query(
    `insert into public.items (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning *`,
    Object.values(f),
  );
  return rows[0];
}

before(async () => {
  db = await createTestDb();
  staff = await createUser(db, "Hub Staff", { staff: true });
  member = await createUser(db, "Member");
});

describe("seed", () => {
  test("loads the 12 sample items on sale and continues tags after them", async () => {
    const { rows } = await db.query(
      "select count(*)::int as n from public.items where status = 'listed'",
    );
    assert.equal(rows[0].n, 12);
    const item = await as(db, staff, (tx) => intake(tx));
    assert.equal(item.id, "RL-JMU-0013");
  });
});

describe("intake", () => {
  test("assigns sequential RL-JMU tags and flags data wipes", async () => {
    const [a, b] = await as(db, staff, async (tx) => [
      await intake(tx),
      await intake(tx, { category: "monitor" }),
    ]);
    assert.match(a.id, /^RL-JMU-\d{4}$/);
    assert.equal(Number(b.id.slice(-4)), Number(a.id.slice(-4)) + 1);
    assert.equal(a.wipe_required, true, "phones need a wipe");
    assert.equal(b.wipe_required, false, "monitors don't");
  });

  test("grading at intake moves the item to graded and logs it", async () => {
    const item = await as(db, staff, (tx) => intake(tx, { grade: "B" }));
    assert.equal(item.status, "graded");
    assert.ok(item.graded_at);
    const { rows } = await as(db, staff, (tx) =>
      tx.query("select type from public.item_events where item_id = $1", [item.id]),
    );
    assert.deepEqual(
      rows.map((r) => r.type),
      ["received"],
    );
  });

  test("parts must say what kind of part they are", async () => {
    await assert.rejects(
      as(db, staff, (tx) => intake(tx, { category: "part" })),
      /part_needs_type/,
    );
  });
});

describe("business rules on sale", () => {
  test("a phone can't be listed before its data is wiped", async () => {
    const item = await as(db, staff, (tx) => intake(tx, { grade: "A" }));
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query(
          "update public.items set status = 'listed', list_paise = 500000, current_paise = 500000 where id = $1",
          [item.id],
        ),
      ),
      /wiped_before_listing/,
    );
    await as(db, staff, (tx) =>
      tx.query(
        "update public.items set wiped_at = now(), wipe_method = 'reset_overwrite', status = 'listed', list_paise = 500000, current_paise = 500000 where id = $1",
        [item.id],
      ),
    );
    const { rows } = await db.query("select status, listed_at from public.items where id = $1", [
      item.id,
    ]);
    assert.equal(rows[0].status, "listed");
    assert.ok(rows[0].listed_at, "listing date set automatically");
  });

  test("grade C devices are stripped, not sold whole", async () => {
    const item = await as(db, staff, (tx) => intake(tx, { category: "monitor", grade: "C" }));
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query("update public.items set status = 'listed', current_paise = 10000 where id = $1", [
          item.id,
        ]),
      ),
      /grade_c_sold_as_parts/,
    );
  });

  test("nothing ungraded or unpriced can go on sale", async () => {
    const item = await as(db, staff, (tx) => intake(tx, { category: "monitor" }));
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query("update public.items set status = 'listed' where id = $1", [item.id]),
      ),
      /graded_after_intake|listed_items_are_sellable/,
    );
  });
});

describe("unsold-stock rules", () => {
  test("day 45 cuts the price 20% once; day 75 downgrades to C for stripping", async () => {
    const item = await as(db, staff, (tx) =>
      intake(tx, {
        category: "monitor",
        grade: "A",
        status: "listed",
        list_paise: 320000,
        current_paise: 320000,
        listed_at: "2026-11-01T00:00:00Z",
      }),
    );
    const run = (when) => db.query("select public.apply_stock_rules($1) as n", [when]);
    await run("2026-12-15T00:00:00Z"); // day 44
    let { rows } = await db.query(
      "select current_paise, grade, status from public.items where id = $1",
      [item.id],
    );
    assert.equal(Number(rows[0].current_paise), 320000);

    await run("2026-12-16T00:00:00Z"); // day 45
    await run("2026-12-20T00:00:00Z"); // still only one cut
    ({ rows } = await db.query(
      "select current_paise, price_cut_at from public.items where id = $1",
      [item.id],
    ));
    assert.equal(Number(rows[0].current_paise), 256000);
    assert.ok(rows[0].price_cut_at);

    await run("2027-01-15T00:00:00Z"); // day 75
    ({ rows } = await db.query("select grade, status from public.items where id = $1", [item.id]));
    assert.deepEqual(rows[0], { grade: "C", status: "stripping" });
  });

  test("only trusted server jobs can run the rules", async () => {
    await assert.rejects(
      as(db, staff, (tx) => tx.query("select public.apply_stock_rules()")),
      /permission denied/,
    );
  });
});

describe("recycler handovers", () => {
  test("recording a handover moves the scrap-cage items out", async () => {
    const item = await as(db, staff, (tx) =>
      intake(tx, { category: "tv", grade: "D", buy_mode: "free" }),
    );
    await as(db, staff, (tx) =>
      tx.query("update public.items set status = 'in_scrap_cage', weight_kg = 14 where id = $1", [
        item.id,
      ]),
    );
    await as(db, staff, (tx) =>
      tx.query(
        "insert into public.handovers (recycler, receipt_no, kg_by_category, item_ids) values ('Authorised recycler', 'R-1', '{\"tv\": 14}', $1)",
        [[item.id]],
      ),
    );
    const { rows } = await db.query("select status, handover_id from public.items where id = $1", [
      item.id,
    ]);
    assert.equal(rows[0].status, "handed_over");
    assert.ok(rows[0].handover_id);
  });
});

describe("who can see and change what", () => {
  test("visitors see stock on sale, but never buy prices or sources", async () => {
    const { rows } = await as(db, null, (tx) =>
      tx.query("select distinct status from public.items"),
    );
    assert.deepEqual(rows.map((r) => r.status).sort(), ["listed"]);
    await assert.rejects(
      as(db, null, (tx) => tx.query("select buy_paise from public.items")),
      /permission denied/,
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select source_name from public.items")),
      /permission denied/,
    );
  });

  test("visitors and non-staff members can't change stock", async () => {
    await assert.rejects(
      as(db, null, (tx) => intake(tx)),
      /permission denied|row-level security/,
    );
    await assert.rejects(
      as(db, member, (tx) => intake(tx)),
      /row-level security/,
    );
    const { affectedRows } = await as(db, member, (tx) =>
      tx.query("update public.items set current_paise = 100"),
    );
    assert.equal(affectedRows, 0);
  });

  test("non-staff can't see partners, handovers or staff", async () => {
    for (const table of ["partners", "institutions", "handovers", "staff", "item_events"]) {
      const { rows } = await as(db, member, (tx) => tx.query(`select * from public.${table}`));
      assert.equal(rows.length, 0, table);
    }
  });

  test("staff can't make themselves admin; admins can add staff", async () => {
    await assert.rejects(
      as(db, staff, (tx) =>
        tx.query("update public.staff set role = 'admin' where user_id = $1", [staff]),
      ).then(async () => {
        const { rows } = await db.query("select role from public.staff where user_id = $1", [
          staff,
        ]);
        if (rows[0].role !== "staff") throw new Error("escalated");
        throw new Error("no change (expected)");
      }),
      /no change/,
    );
    await as(db, ADMIN_ID, (tx) =>
      tx.query("insert into public.staff (user_id, full_name) values ($1, 'Member')", [member]),
    );
    const { rows } = await db.query("select count(*)::int as n from public.staff");
    assert.equal(rows[0].n, 3);
    await db.query("delete from public.staff where user_id = $1", [member]);
  });

  test("anyone can send a request; only staff read it, and status can't be faked", async () => {
    await as(db, null, (tx) =>
      tx.query(
        "insert into public.submissions (kind, fields, status) values ('shop_partner', '{\"shop\":\"Sharma Mobiles\"}', 'done')",
      ),
    );
    await assert.rejects(
      as(db, null, (tx) => tx.query("select * from public.submissions")),
      /permission denied/,
    );
    const { rows } = await as(db, staff, (tx) =>
      tx.query("select kind, status from public.submissions"),
    );
    assert.deepEqual(rows, [{ kind: "shop_partner", status: "new" }]);
  });

  test("only staff upload item photos", async () => {
    await as(db, staff, (tx) =>
      tx.query(
        "insert into storage.objects (bucket_id, name) values ('item-photos', 'RL-JMU-0001/0.jpg')",
      ),
    );
    await assert.rejects(
      as(db, member, (tx) =>
        tx.query("insert into storage.objects (bucket_id, name) values ('item-photos', 'x.jpg')"),
      ),
      /row-level security/,
    );
  });
});

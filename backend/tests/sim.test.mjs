import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { buildSeed } from "../sim/seed.mjs";
import { DEMO_ACCOUNTS, ITEMS_PER_MONTH } from "../sim/config.mjs";
import { createTestDb, createUser } from "./db.mjs";

const TODAY = new Date("2026-10-14T12:00:00Z");

describe("simulation seed (backend/sim/seed.mjs)", () => {
  let db;
  let seed;
  before(async () => {
    seed = buildSeed({ today: TODAY, auth: "plain" });
    db = await createTestDb({ seed: false });
    await db.exec(seed.sql);
  });

  test("follows the business plan's ramp, source mix and grade split", async () => {
    const intake = await db.query(
      "select count(*)::int as n from public.items where source_type <> 'stripped'",
    );
    const planned = ITEMS_PER_MONTH.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(intake.rows[0].n - planned) <= planned * 0.02, `about ${planned} items`);
    const { rows } = await db.query(
      `select grade::text, count(*)::float / sum(count(*)) over () as share
         from public.items where source_type <> 'stripped' and grade is not null group by 1`,
    );
    const share = Object.fromEntries(rows.map((r) => [r.grade, r.share]));
    // A and D as planned; C also gets the B devices that couldn't be fixed.
    assert.ok(Math.abs(share.A - 0.15) < 0.04, `A ${share.A}`);
    assert.ok(Math.abs(share.D - 0.3) < 0.05, `D ${share.D}`);
    assert.ok(share.B + share.C > 0.5 && share.B + share.C < 0.6);
    const reuse = await db.query(
      "select items_reused, active_partner_shops from public.impact_totals",
    );
    assert.ok(Number(reuse.rows[0].items_reused) / intake.rows[0].n >= 0.65, "reuse target met");
    assert.equal(Number(reuse.rows[0].active_partner_shops), 23);
  });

  test("every item respects the hub's rules, and new tags continue after the seed", async () => {
    const months = await db.query(
      `select date_trunc('month', received_at) m, count(*)::int n from public.items
        where source_type <> 'stripped' group by 1 order by 1`,
    );
    assert.ok(months.rows.length >= 6);
    const listedNotWiped = await db.query(
      `select count(*)::int as n from public.items
        where status in ('listed','reserved','sold') and wipe_required and wiped_at is null`,
    );
    assert.equal(listedNotWiped.rows[0].n, 0);
    const handed = await db.query(
      "select count(*)::int as n from public.items where status = 'handed_over' and handover_id is null",
    );
    assert.equal(handed.rows[0].n, 0, "every handed-over item points at its handover");
    const counter = await db.query(
      "select last_number from public.item_counters where hub_code = 'JMU'",
    );
    const max = await db.query("select max(substr(id, 8)::int) as n from public.items");
    assert.equal(counter.rows[0].last_number, max.rows[0].n, "new tags continue after the seed");
  });

  test("creates one demo login per role, all fictional", async () => {
    const { rows } = await db.query(
      "select u.email, p.role::text from auth.users u join public.profiles p on p.user_id = u.id",
    );
    for (const a of DEMO_ACCOUNTS)
      assert.ok(
        rows.some((r) => r.email === a.email),
        a.email,
      );
    assert.ok(rows.every((r) => r.email.endsWith("@reloop.demo")));
    const admin = await db.query(
      "select count(*)::int as n from public.staff where role = 'admin'",
    );
    assert.equal(admin.rows[0].n, 1);
  });

  test("can run again, giving the same data", async () => {
    const before_ = await db.query("select count(*)::int as n, max(id) as last from public.items");
    await db.exec(buildSeed({ today: TODAY, auth: "plain" }).sql);
    const after = await db.query("select count(*)::int as n, max(id) as last from public.items");
    assert.deepEqual(after.rows, before_.rows);
  });

  test("refuses a database that holds real accounts", async () => {
    const real = await createTestDb({ seed: false });
    await createUser(real, "Real Person");
    await assert.rejects(real.exec(seed.sql), /Refusing to seed/);
  });

  test("on the simulation database, a re-seed also clears visitor sign-ups and their items", async () => {
    await createUser(db, "Demo Visitor");
    const staff = await db.query(
      "select u.id from auth.users u where u.email = 'demo-staff@reloop.demo'",
    );
    await db.query(
      `insert into public.items (source_type, category, grade, buy_mode, created_by)
       values ('household', 'accessory', 'A', 'cash', $1)`,
      [staff.rows[0].id],
    );
    await db.exec(buildSeed({ today: TODAY, auth: "plain" }).sql);
    const visitors = await db.query(
      "select count(*)::int as n from auth.users where email not like '%@reloop.demo'",
    );
    assert.equal(visitors.rows[0].n, 0);
    const logged = await db.query(
      "select count(*)::int as n from public.items where created_by is not null",
    );
    assert.equal(logged.rows[0].n, 0);
  });

  test("leaves nothing for the daily stock rules to change", async () => {
    const end = new Date(Date.UTC(2026, 9, 14, 9));
    const { rows } = await db.query("select public.apply_stock_rules($1) as n", [end]);
    assert.equal(rows[0].n, 0);
  });

  test("no reservation comes before its item was listed", async () => {
    const { rows } = await db.query(
      `select count(*)::int as n from public.submissions s join public.items i on i.id = s.item_id
        where s.kind = 'reservation' and s.created_at < i.listed_at`,
    );
    assert.equal(rows[0].n, 0);
  });

  test("the demo shop has an offer to answer and one booked for the route; bought lots are paid with receipts", async () => {
    const shop = await db.query(
      `select x.status, p.route_date from public.shop_submissions x
         join auth.users u on u.id = x.shop_owner_id
         left join public.pickups p on p.shop_submission_id = x.id
        where u.email = 'demo-shop@reloop.demo' and x.status in ('Offered', 'Accepted')`,
    );
    assert.deepEqual([...new Set(shop.rows.map((r) => r.status))].sort(), ["Accepted", "Offered"]);
    assert.ok(shop.rows.find((r) => r.status === "Accepted").route_date);
    const pay = await db.query(
      `select count(*)::int as paid,
              (select count(*)::int from public.shop_submissions x where x.status = 'Purchased' and x.purchase_price > 0
                 and not exists (select 1 from public.payouts p where p.shop_submission_id = x.id)) as due,
              bool_and(receipt_no ~ '^RL-PAY-[0-9]{4}-[0-9]{4}$') as numbered
         from public.payouts`,
    );
    assert.ok(pay.rows[0].paid > 0);
    assert.equal(pay.rows[0].due, 1);
    assert.equal(pay.rows[0].numbered, true);
    // New payouts continue the numbering.
    const next = await db.query("select max(last_number) as n from public.payout_counters");
    assert.equal(Number(next.rows[0].n), pay.rows[0].paid);
  });

  test("listed items have fair-price bands from simulated references, and price history", async () => {
    const { rows } = await db.query(
      `select count(*) filter (where band_low_paise is not null)::int as banded, count(*)::int as listed,
              count(*) filter (where new_price_paise is not null)::int as with_new
         from public.public_price_bands`,
    );
    assert.ok(rows[0].listed > 0 && rows[0].banded / rows[0].listed > 0.8, JSON.stringify(rows[0]));
    assert.ok(rows[0].with_new > 0);
    const cut = await db.query(
      "select count(*)::int as n from public.public_price_history h join public.items i on i.id = h.item_id where i.price_cut_at is not null",
    );
    assert.ok(cut.rows[0].n > 0, "price cuts show in the history");
  });

  test("the demo buyer has a device under warranty with an open claim", async () => {
    const { rows } = await db.query(
      // Measured from the seed's own "today", not the clock, so the test doesn't age.
      `select c.status, i.grade::text, i.sold_at >= $1::timestamptz - interval '30 days' as covered
         from public.warranty_claims c join public.items i on i.id = c.item_id
         join auth.users u on u.id = c.buyer_id where u.email = 'demo-buyer@reloop.demo'`,
      [TODAY],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "open");
    assert.ok(["A", "B"].includes(rows[0].grade) && rows[0].covered);
  });

  test("the demo buyer has saved items: one cheaper since, one sold, with notices", async () => {
    const { rows } = await db.query(
      `select s.price_when_saved_paise > i.current_paise as cheaper, i.status::text as status
         from public.saved_items s join public.items i on i.id = s.item_id
         join auth.users u on u.id = s.user_id where u.email = 'demo-buyer@reloop.demo'`,
    );
    assert.equal(rows.length, 4);
    assert.equal(rows.filter((r) => r.cheaper && r.status === "listed").length, 1);
    assert.equal(rows.filter((r) => r.status === "sold").length, 1);
    const own = await db.query(
      `select count(*)::int as n from public.saved_items s join auth.users u on u.id = s.user_id
         join public.submissions r on r.item_id = s.item_id and r.buyer_id = s.user_id
        where u.email = 'demo-buyer@reloop.demo'`,
    );
    assert.equal(own.rows[0].n, 0, "never the buyer's own reservations");
    const cut = await db.query(
      `select count(*)::int as n from public.saved_items s join public.items i on i.id = s.item_id
        where s.price_when_saved_paise = i.list_paise and i.price_cut_at > s.saved_at
          and s.saved_at > i.listed_at`,
    );
    assert.equal(cut.rows[0].n, 1, "the price drop is a real day-45 cut after saving");
    const notes = await db.query(
      "select kind from public.notifications where kind like 'saved_%' order by kind",
    );
    assert.deepEqual(
      notes.rows.map((r) => r.kind),
      ["saved_price_drop", "saved_sold"],
    );
  });

  test("the demo buyer has their own requests and notifications, and a pickup is booked", async () => {
    const mine = await db.query(
      `select s.status, s.cancelled_by, s.cancel_reason from public.submissions s
         join auth.users u on u.id = s.buyer_id where u.email = 'demo-buyer@reloop.demo'`,
    );
    assert.ok(mine.rows.length >= 4);
    assert.ok(
      mine.rows.some(
        (r) => r.status === "cancelled" && r.cancelled_by === "staff" && r.cancel_reason,
      ),
    );
    const notes = await db.query(
      `select count(*)::int as n from public.notifications n
         join auth.users u on u.id = n.user_id where u.email = 'demo-buyer@reloop.demo'`,
    );
    assert.ok(notes.rows[0].n >= 1);
    const booked = await db.query(
      "select scheduled_for from public.submissions where status = 'scheduled' and kind = 'institution_pickup'",
    );
    assert.equal(booked.rows.length, 1);
    assert.ok([2, 5].includes(new Date(booked.rows[0].scheduled_for).getUTCDay()));
    const cancelled = await db.query(
      "select count(*)::int as n from public.submissions where status = 'cancelled' and cancelled_by is null",
    );
    assert.equal(cancelled.rows[0].n, 0, "every cancelled request says who cancelled it");
  });
});

describe("simulation demo logins", () => {
  test("can't have their role, admin status, password-reset flag, name or shop changed, or be deleted", async () => {
    const db = await createTestDb({ seed: false });
    await db.exec(buildSeed({ today: TODAY, auth: "plain" }).sql);
    const staff = await db.query(
      "select id from auth.users where email = 'demo-staff@reloop.demo'",
    );
    for (const sql of [
      "update public.staff set role = 'admin' where user_id = $1",
      "delete from public.staff where user_id = $1",
      "update public.profiles set must_change_password = true where user_id = $1",
    ])
      await assert.rejects(
        db.query(sql, [staff.rows[0].id]),
        /Demo accounts stay as they are/,
        sql,
      );
    // Nor renamed, their shop changed, or deleted (an admin approving a deletion request).
    const shop = await db.query("select id from auth.users where email = 'demo-shop@reloop.demo'");
    for (const [sql, id] of [
      [
        "update public.profiles set full_name = 'Someone else' where user_id = $1",
        staff.rows[0].id,
      ],
      ["update public.shop_owners set shop_name = 'Renamed' where id = $1", shop.rows[0].id],
      ["delete from auth.users where id = $1", shop.rows[0].id],
    ])
      await assert.rejects(db.query(sql, [id]), /Demo accounts stay as they are/, sql);
    const admin = await db.query(
      "select id from auth.users where email = 'demo-admin@reloop.demo'",
    );
    const buyer = await db.query(
      "select id from auth.users where email = 'demo-buyer@reloop.demo'",
    );
    const asUser = (id, sql, args = []) =>
      db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: id, role: "authenticated" }),
        ]);
        return tx.query(sql, args);
      });
    const req = await asUser(buyer.rows[0].id, "select public.request_account_deletion('') as id");
    await assert.rejects(
      asUser(admin.rows[0].id, "select public.approve_account_deletion($1)", [req.rows[0].id]),
      /Demo accounts stay as they are/,
    );
    assert.equal(
      (await db.query("select 1 from auth.users where id = $1", [buyer.rows[0].id])).rows.length,
      1,
    );
    // Other accounts (visitors) can still be managed.
    const visitor = await createUser(db, "Visitor", { staff: true });
    await db.query("delete from public.staff where user_id = $1", [visitor]);
    // And the seed itself can run again.
    await db.exec(buildSeed({ today: TODAY, auth: "plain" }).sql);
  });
});

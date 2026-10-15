import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { buildSeed, loadLocalInputs } from "../sim/seed.mjs";
import {
  DEMO_ACCOUNTS,
  ITEMS_PER_MONTH,
  PARTNER_SHOPS_BY_MONTH,
  SCRAP_KG_BY_MONTH,
} from "../sim/config.mjs";
import { createTestDb, createUser } from "./db.mjs";

const TODAY = new Date("2026-10-14T12:00:00Z");
// Hermetic: always the committed placeholders, never a local-inputs.json.
const PLACEHOLDERS = loadLocalInputs({ placeholdersOnly: true });

describe("simulation seed (backend/sim/seed.mjs)", () => {
  let db;
  let seed;
  before(async () => {
    seed = buildSeed({ today: TODAY, auth: "plain", localInputs: PLACEHOLDERS });
    db = await createTestDb({ seed: false });
    await db.exec(seed.sql);
  });

  test("follows Business Plan v2: 40 shops, the kg ramp, the device ramp and the grade split", async () => {
    const devices = await db.query(
      "select count(*)::int as n from public.items where category <> 'part'",
    );
    const planned = ITEMS_PER_MONTH.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(devices.rows[0].n - planned) <= planned * 0.03, `about ${planned} devices`);
    const { rows } = await db.query(
      `select grade::text, count(*)::float / sum(count(*)) over () as share
         from public.items where category <> 'part' and grade is not null group by 1`,
    );
    const share = Object.fromEntries(rows.map((r) => [r.grade, r.share]));
    // Unsold and unfixable devices move to C, so C ends above its planned share.
    assert.ok(share.A > 0.05 && share.A < 0.22, `A ${share.A}`);
    assert.ok(Math.abs(share.D - 0.2) < 0.07, `D ${share.D}`);
    assert.ok(share.C > 0.4, `C ${share.C}`);
    const kpi = (await db.query("select * from public.public_kpis")).rows[0];
    assert.equal(
      Number(kpi.partner_repair_shops) + Number(kpi.partner_retailers),
      PARTNER_SHOPS_BY_MONTH.at(-1),
    );
    assert.equal(Number(kpi.partner_retailers), 5);
    const kg = await db.query(
      "select sum(screens_kg + boards_kg + batteries_kg + other_kg) as kg from public.scrap_weighins",
    );
    const plannedKg = SCRAP_KG_BY_MONTH.reduce((a, b) => a + b, 0);
    assert.ok(
      Math.abs(Number(kg.rows[0].kg) - plannedKg) <= 8,
      `about ${plannedKg} kg: ${kg.rows[0].kg}`,
    );
    assert.ok(Number(kpi.parts_sold) > 0 && Number(kpi.devices_resold) > 0);
  });

  test("the first two months run Tuesdays only; Fridays, retailers and institution lots start in month 3", async () => {
    const dow = await db.query(
      `select extract(dow from weighed_at at time zone 'UTC')::int as d, count(*)::int as n,
              min(weighed_at) as first from public.scrap_weighins group by 1 order by 1`,
    );
    assert.deepEqual(
      dow.rows.map((r) => r.d),
      [2, 5],
    );
    const cutoff = new Date(TODAY.getTime() - 120 * 864e5);
    assert.ok(
      new Date(dow.rows.find((r) => r.d === 5).first) > cutoff,
      "no Friday weigh-in before month 3",
    );
    const lot = await db.query(
      "select min(lot_date) as first, count(*)::int as n from public.institution_lots",
    );
    assert.ok(lot.rows[0].n >= 3 && new Date(lot.rows[0].first) > cutoff);
    const fees = await db.query(
      "select bool_and(fee_paise = 300000) as ok, bool_and(fee_receipt_no ~ '^RL-FEE-[0-9]{4}-[0-9]{4}$') as numbered from public.institution_lots",
    );
    assert.deepEqual(fees.rows[0], { ok: true, numbered: true });
  });

  test("every weigh-in is priced by the public rate card and has a numbered, tokenised receipt", async () => {
    const bad = await db.query(
      `select count(*)::int as n from public.scrap_weighins w
        where w.amount_paise <> round(w.screens_kg * 17000 + w.boards_kg * 13000 + w.batteries_kg * 80000 + w.other_kg * 500)`,
    );
    assert.equal(bad.rows[0].n, 0);
    const r = await db.query(
      `select count(*)::int as n, bool_and(receipt_token ~ '^[0-9a-f]{32}$') as tokens,
              count(distinct receipt_no)::int as distinct_n, count(*)::int as total
         from public.payouts`,
    );
    assert.equal(r.rows[0].tokens, true);
    assert.equal(r.rows[0].distinct_n, r.rows[0].total);
    const unsent = await db.query(
      "select count(*)::int as n from public.payouts where whatsapp_sent_at is not null",
    );
    assert.equal(unsent.rows[0].n, 0, "the simulation marks receipts not sent");
  });

  test("the bins add up: ledger lines belong to a handover or are still waiting, and VRRG rates stay empty", async () => {
    const open = await db.query(
      "select bin, round(sum(kg), 1) as kg from public.scrap_ledger where handover_id is null group by 1",
    );
    for (const r of open.rows)
      assert.ok(Number(r.kg) < (r.bin === "batteries" ? 40 : 160), `${r.bin} ${r.kg}`);
    const h = await db.query(
      `select count(*)::int as n, count(*) filter (where rates_paise is not null)::int as with_rates,
              bool_and(recycler = 'VRRG Group, Gangyal') as named
         from public.handovers`,
    );
    assert.ok(h.rows[0].n >= 6);
    assert.equal(h.rows[0].with_rates, 0, "plan prices are a local-only input");
    assert.equal(h.rows[0].named, true);
    const kinds = await db.query(
      "select kind, count(*)::int as n from public.handovers group by 1 order by 1",
    );
    assert.deepEqual(
      kinds.rows.map((k) => k.kind),
      ["hub", "institution_lot"],
    );
    const orphan = await db.query(
      "select count(*)::int as n from public.scrap_ledger l where l.item_id is not null and not exists (select 1 from public.items i where i.id = l.item_id)",
    );
    assert.equal(orphan.rows[0].n, 0);
  });

  test("the Parts Exchange has approved, sold, waiting and rejected listings; shops are paid after day 7", async () => {
    const l = await db.query(
      "select status, count(*)::int as n from public.part_listings group by 1",
    );
    const by = Object.fromEntries(l.rows.map((r) => [r.status, r.n]));
    assert.ok(by.approved >= 3, JSON.stringify(by));
    assert.ok((by.submitted ?? 0) + (by.at_hub ?? 0) >= 1, JSON.stringify(by));
    assert.ok(by.rejected >= 1, JSON.stringify(by));
    const sales = await db.query(
      `select count(*)::int as n, count(*) filter (where status = 'paid')::int as paid,
              bool_and(commission_paise + shop_share_paise = sold_paise) as adds_up
         from public.exchange_sales`,
    );
    assert.ok(sales.rows[0].n >= 1 && sales.rows[0].adds_up);
    const early = await db.query(
      `select count(*)::int as n from public.payouts p join public.exchange_sales s on s.id = p.exchange_sale_id
        where p.paid_at < s.payout_due_on`,
    );
    assert.equal(early.rows[0].n, 0);
    const named = await db.query(
      "select count(*)::int as n from public.parts_exchange_listings where listed_by_name is not null",
    );
    assert.ok(named.rows[0].n >= 1);
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
    await db.exec(buildSeed({ today: TODAY, auth: "plain", localInputs: PLACEHOLDERS }).sql);
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
      `insert into public.items (source_type, category, grade, buy_mode, created_by, ownership_confirmed_at)
       values ('retailer', 'accessory', 'A', 'cash', $1, now())`,
      [staff.rows[0].id],
    );
    await db.exec(buildSeed({ today: TODAY, auth: "plain", localInputs: PLACEHOLDERS }).sql);
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
    await db.exec(buildSeed({ today: TODAY, auth: "plain", localInputs: PLACEHOLDERS }).sql);
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
    await db.exec(buildSeed({ today: TODAY, auth: "plain", localInputs: PLACEHOLDERS }).sql);
  });
});

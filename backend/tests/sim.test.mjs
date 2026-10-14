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
});

describe("simulation demo logins", () => {
  test("can't have their role, admin status or password-reset flag changed", async () => {
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
    // Other accounts (visitors) can still be managed.
    const visitor = await createUser(db, "Visitor", { staff: true });
    await db.query("delete from public.staff where user_id = $1", [visitor]);
    // And the seed itself can run again.
    await db.exec(buildSeed({ today: TODAY, auth: "plain" }).sql);
  });
});

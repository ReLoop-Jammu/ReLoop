import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { as, createTestDb, readSql } from "./db.mjs";

// supabase-fixes/demo-stock.sql and demo-stock-wipe.sql: try the live shop, then remove it all.
let db;
before(async () => {
  db = await createTestDb({ seed: false });
  await db.query("update public.item_counters set last_number = 5 where hub_code = 'JMU'");
});

describe("demo stock", () => {
  test("adds ten listed items visitors can see, and refuses to run twice", async () => {
    await db.exec(readSql("../supabase-fixes/demo-stock.sql"));
    const rows = (
      await as(db, null, (tx) => tx.query("select id, status from public.items order by id"))
    ).rows;
    assert.equal(rows.length, 10);
    assert.equal(rows[0].id, "RL-JMU-0006");
    assert.ok(rows.every((r) => r.status === "listed"));
    await assert.rejects(db.exec(readSql("../supabase-fixes/demo-stock.sql")), /already there/);
    await db.query("rollback");
  });

  test("the wipe removes the items and their requests, and resets the tag counter", async () => {
    await db.query(
      `insert into public.submissions (kind, fields, item_id) values ('reservation', '{"name":"Test","phone":"9000000000"}', 'RL-JMU-0006')`,
    );
    await db.exec(readSql("../supabase-fixes/demo-stock-wipe.sql"));
    assert.equal((await db.query("select count(*)::int as n from public.items")).rows[0].n, 0);
    assert.equal(
      (await db.query("select count(*)::int as n from public.submissions")).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query("select last_number from public.item_counters where hub_code = 'JMU'"))
        .rows[0].last_number,
      5,
    );
  });
});

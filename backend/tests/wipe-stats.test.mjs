import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { as, createTestDb } from "./db.mjs";

// Batch 25 (20261107000007): the public wipe count.
let db;
before(async () => {
  db = await createTestDb({ seed: false });
});

describe("public_wipe_stats", () => {
  test("counts wiped items by method and boards, and nothing else", async () => {
    await db.query(
      `insert into public.items (source_type, category, part_type, buy_mode, grade, status, wipe_required, wipe_method, wiped_at)
       values ('repair_shop', 'phone', null, 'cash', 'A', 'graded', true, 'reset_overwrite', now()),
              ('repair_shop', 'laptop', null, 'cash', 'D', 'in_scrap_cage', true, 'drilled', now()),
              ('stripped', 'part', 'board', 'free', 'C', 'graded', true, 'drive_wipe', now()),
              ('repair_shop', 'monitor', null, 'cash', 'A', 'graded', false, null, null)`,
    );
    const r = (await as(db, null, (tx) => tx.query("select * from public.public_wipe_stats")))
      .rows[0];
    assert.equal(Number(r.wiped_total), 3);
    assert.equal(Number(r.reset_overwrite), 1);
    assert.equal(Number(r.storage_destroyed), 1);
    assert.equal(Number(r.boards_wiped), 1);
    assert.ok(r.last_wiped_on);
    assert.deepEqual(Object.keys(r), [
      "wiped_total",
      "reset_overwrite",
      "drive_wipe",
      "storage_destroyed",
      "boards_wiped",
      "last_wiped_on",
    ]);
  });
});

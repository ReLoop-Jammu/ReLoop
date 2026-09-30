import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { ADMIN_ID, as, createTestDb, createUser, RELOOP_ORG_ID } from "./db.mjs";

let db;
let alice; // individual seller
let bob; // another member
let partner; // owner of a verified organization
let partnerOrg;

const newListing = (overrides = {}) => ({
  title: "Test laptop",
  category: "devices",
  condition: "working",
  price_paise: 100000,
  city: "Jammu, J&K",
  status: "pending_review",
  ...overrides,
});

async function insertListing(tx, sellerId, fields) {
  const f = { seller_id: sellerId, ...fields };
  const cols = Object.keys(f);
  const { rows } = await tx.query(
    `insert into public.listings (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})
     returning id, slug, status, published_at`,
    Object.values(f),
  );
  return rows[0];
}

before(async () => {
  db = await createTestDb();
  alice = await createUser(db, "alice");
  bob = await createUser(db, "bob");
  partner = await createUser(db, "partner");
  // Partner applies, then an admin verifies them.
  partnerOrg = await as(db, partner, async (tx) => {
    const { rows } = await tx.query(
      `insert into public.organizations (owner_id, name, slug, type, city, verification_status)
       values ($1, 'Jammu Collectors', 'jammu-collectors', 'collector', 'Jammu', 'verified') returning id, verification_status`,
      [partner],
    );
    assert.equal(rows[0].verification_status, "pending", "members cannot self-verify");
    return rows[0].id;
  });
  await as(db, ADMIN_ID, (tx) =>
    tx.query("update public.organizations set verification_status = 'verified' where id = $1", [
      partnerOrg,
    ]),
  );
});

describe("seed", () => {
  test("loads 16 published listings under the verified ReLoop organization", async () => {
    const { rows } = await db.query(
      "select count(*)::int as n from public.listings where status = 'published' and organization_id = $1",
      [RELOOP_ORG_ID],
    );
    assert.equal(rows[0].n, 16);
  });

  test("full-text search finds listings by title words", async () => {
    const { rows } = await db.query(
      "select slug from public.listings where search @@ websearch_to_tsquery('simple', 'thinkpad')",
    );
    assert.deepEqual(
      rows.map((r) => r.slug),
      ["lenovo-thinkpad-t480"],
    );
  });
});

describe("hybrid moderation (ADR 0002)", () => {
  test("an individual's listing goes to review, even if they ask to publish", async () => {
    const listing = await as(db, alice, (tx) =>
      insertListing(tx, alice, newListing({ status: "published" })),
    );
    assert.equal(listing.status, "pending_review");
    assert.equal(listing.published_at, null);
    assert.match(listing.slug, /^test-laptop-[a-f0-9]{6}$/);
  });

  test("a verified partner's listing publishes immediately", async () => {
    const listing = await as(db, partner, (tx) =>
      insertListing(
        tx,
        partner,
        newListing({ organization_id: partnerOrg, title: "Bulk RAM lot" }),
      ),
    );
    assert.equal(listing.status, "published");
    assert.ok(listing.published_at);
  });

  test("a member cannot list under someone else's organization", async () => {
    await assert.rejects(
      as(db, alice, (tx) => insertListing(tx, alice, newListing({ organization_id: partnerOrg }))),
      /your own organization/,
    );
  });

  test("editing a published individual listing sends it back to review", async () => {
    const id = (await as(db, alice, (tx) => insertListing(tx, alice, newListing()))).id;
    await as(db, ADMIN_ID, (tx) =>
      tx.query("update public.listings set status = 'published' where id = $1", [id]),
    );
    const { rows } = await as(db, alice, (tx) =>
      tx.query("update public.listings set price_paise = 1 where id = $1 returning status", [id]),
    );
    assert.equal(rows[0].status, "pending_review");
  });

  test("members cannot reject listings; admins can, with a reason, and it is audited", async () => {
    const id = (await as(db, alice, (tx) => insertListing(tx, alice, newListing()))).id;
    await assert.rejects(
      as(db, alice, (tx) =>
        tx.query(
          "update public.listings set status = 'rejected', rejection_reason = 'x' where id = $1",
          [id],
        ),
      ),
      /Only ReLoop admins/,
    );
    await as(db, ADMIN_ID, (tx) =>
      tx.query(
        "update public.listings set status = 'rejected', rejection_reason = 'Blurry photos' where id = $1",
        [id],
      ),
    );
    const { rows } = await as(db, ADMIN_ID, (tx) =>
      tx.query("select action, actor_id, details from public.audit_log where entity_id = $1", [id]),
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].action, "listing.rejected");
    assert.equal(rows[0].actor_id, ADMIN_ID);
    assert.equal(rows[0].details.reason, "Blurry photos");
  });

  test("partner verification is audited", async () => {
    const { rows } = await db.query("select action from public.audit_log where entity_id = $1", [
      partnerOrg,
    ]);
    assert.deepEqual(
      rows.map((r) => r.action),
      ["organization.verified"],
    );
  });
});

describe("row level security", () => {
  test("visitors see only published listings", async () => {
    const { rows } = await as(db, null, (tx) =>
      tx.query("select distinct status from public.listings order by status"),
    );
    assert.deepEqual(
      rows.map((r) => r.status),
      ["published"],
    );
  });

  test("sellers see their own unpublished listings; others do not", async () => {
    const id = (
      await as(db, alice, (tx) =>
        insertListing(tx, alice, newListing({ title: "Private draft", status: "draft" })),
      )
    ).id;
    const mine = await as(db, alice, (tx) =>
      tx.query("select id from public.listings where id = $1", [id]),
    );
    const theirs = await as(db, bob, (tx) =>
      tx.query("select id from public.listings where id = $1", [id]),
    );
    assert.equal(mine.rows.length, 1);
    assert.equal(theirs.rows.length, 0);
  });

  test("members cannot change other people's listings", async () => {
    const { affectedRows } = await as(db, bob, (tx) =>
      tx.query("update public.listings set title = 'Hacked' where organization_id = $1", [
        RELOOP_ORG_ID,
      ]),
    );
    assert.equal(affectedRows, 0);
  });

  test("members cannot create listings for someone else", async () => {
    await assert.rejects(
      as(db, bob, (tx) => insertListing(tx, alice, newListing())),
      /row-level security/,
    );
  });

  test("members cannot make themselves admin", async () => {
    await as(db, bob, (tx) =>
      tx.query("update public.profiles set is_admin = true, full_name = 'Bob B' where id = $1", [
        bob,
      ]),
    );
    const { rows } = await db.query(
      "select is_admin, full_name from public.profiles where id = $1",
      [bob],
    );
    assert.equal(rows[0].is_admin, false);
    assert.equal(rows[0].full_name, "Bob B");
  });

  test("members cannot read other members' profiles", async () => {
    const { rows } = await as(db, bob, (tx) => tx.query("select id from public.profiles"));
    assert.deepEqual(
      rows.map((r) => r.id),
      [bob],
    );
  });

  test("saved listings and baskets are private", async () => {
    const listingId = (
      await db.query("select id from public.listings where slug = 'dell-22-inch-monitor'")
    ).rows[0].id;
    await as(db, alice, (tx) =>
      tx.query("insert into public.saved_listings (user_id, listing_id) values ($1, $2)", [
        alice,
        listingId,
      ]),
    );
    await assert.rejects(
      as(db, bob, (tx) =>
        tx.query("insert into public.basket_items (user_id, listing_id) values ($1, $2)", [
          alice,
          listingId,
        ]),
      ),
      /row-level security/,
    );
    const { rows } = await as(db, bob, (tx) => tx.query("select * from public.saved_listings"));
    assert.equal(rows.length, 0);
  });
});

describe("inquiries", () => {
  test("visitors can inquire about published listings but cannot read inquiries", async () => {
    const listingId = (
      await db.query("select id from public.listings where slug = 'lenovo-thinkpad-t480'")
    ).rows[0].id;
    await as(db, null, (tx) =>
      tx.query(
        "insert into public.inquiries (listing_id, name, contact, message, status) values ($1, 'Sam', '9876543210', 'Still available?', 'closed')",
        [listingId],
      ),
    );
    const visible = await as(db, null, (tx) => tx.query("select * from public.inquiries"));
    assert.equal(visible.rows.length, 0);
    const { rows } = await as(db, ADMIN_ID, (tx) =>
      tx.query("select status, buyer_id from public.inquiries"),
    );
    assert.deepEqual(rows, [{ status: "new", buyer_id: null }], "status is forced to new");
  });

  test("nobody can inquire about an unpublished listing", async () => {
    const id = (await as(db, alice, (tx) => insertListing(tx, alice, newListing()))).id;
    await assert.rejects(
      as(db, bob, (tx) =>
        tx.query(
          "insert into public.inquiries (listing_id, name, contact) values ($1, 'Bob', 'bob@test.local')",
          [id],
        ),
      ),
      /row-level security/,
    );
  });

  test("a signed-in buyer sees only their own inquiries, stamped with their id", async () => {
    const listingId = (
      await db.query("select id from public.listings where slug = 'printer-for-parts'")
    ).rows[0].id;
    await as(db, bob, (tx) =>
      tx.query(
        "insert into public.inquiries (listing_id, name, contact, buyer_id) values ($1, 'Bob', 'bob@test.local', $2)",
        [listingId, alice],
      ),
    );
    const bobs = await as(db, bob, (tx) => tx.query("select buyer_id from public.inquiries"));
    assert.deepEqual(bobs.rows, [{ buyer_id: bob }], "buyer_id cannot be spoofed");
    const alices = await as(db, alice, (tx) => tx.query("select * from public.inquiries"));
    assert.equal(alices.rows.length, 0);
  });

  test("only admins can update inquiries", async () => {
    const { affectedRows } = await as(db, bob, (tx) =>
      tx.query("update public.inquiries set status = 'closed'"),
    );
    assert.equal(affectedRows, 0);
  });
});

describe("photo storage", () => {
  test("members can upload only into their own folder", async () => {
    await as(db, alice, (tx) =>
      tx.query("insert into storage.objects (bucket_id, name) values ('listing-photos', $1)", [
        `${alice}/l1/front.jpg`,
      ]),
    );
    await assert.rejects(
      as(db, bob, (tx) =>
        tx.query("insert into storage.objects (bucket_id, name) values ('listing-photos', $1)", [
          `${alice}/l1/evil.jpg`,
        ]),
      ),
      /row-level security/,
    );
  });
});

import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");

/** Fresh in-memory database with the shim, all migrations and the seed applied. */
export async function createTestDb() {
  const db = new PGlite();
  await db.exec(read("tests", "supabase-shim.sql"));
  const migrations = readdirSync(join(root, "supabase", "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of migrations) await db.exec(read("supabase", "migrations", file));
  await db.exec(read("supabase", "seed.sql"));
  return db;
}

export const ADMIN_ID = "00000000-0000-4000-8000-000000000001";
export const RELOOP_ORG_ID = "00000000-0000-4000-8000-0000000000a1";

/** Creates an auth user (and, via trigger, a profile). */
export async function createUser(db, name) {
  const { rows } = await db.query(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [`${name}@test.local`, { full_name: name }],
  );
  return rows[0].id;
}

/**
 * Runs `fn` inside a transaction as a browser client would: role anon or
 * authenticated, with the user's id in the JWT claims. Always rolls back
 * the role switch; data changes are committed unless `fn` throws.
 */
export async function as(db, userId, fn) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${userId ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(userId ? { sub: userId, role: "authenticated" } : { role: "anon" }),
    ]);
    return fn(tx);
  });
}

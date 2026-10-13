import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");

export const MIGRATIONS = readdirSync(join(root, "supabase", "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

/** Reads a migration, or any file relative to the repo root with "../". */
export const readSql = (path) =>
  read(path.includes("/") ? path : join("supabase", "migrations", path));

/**
 * Fresh in-memory database with the shim and the given migrations (default:
 * all of them, in order), plus the seed unless seed is false.
 */
export async function createTestDb({ migrations = MIGRATIONS, seed = true } = {}) {
  const db = new PGlite();
  await db.exec(read("tests", "supabase-shim.sql"));
  for (const file of migrations) await db.exec(readSql(file));
  if (seed) await db.exec(read("supabase", "seed.sql"));
  return db;
}

export const ADMIN_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Creates an auth user; the sign-up trigger gives them a profile. Pass staff: true
 * to add them to the hub staff list, and meta for extra sign-up fields
 * (account_type, shop_name, business_address, gstin).
 */
export async function createUser(db, name, { staff = false, meta = {} } = {}) {
  const { rows } = await db.query(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [`${name}@test.local`, { full_name: name, phone: "9000000000", ...meta }],
  );
  if (staff)
    await db.query("insert into public.staff (user_id, full_name) values ($1, $2)", [
      rows[0].id,
      name,
    ]);
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

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUYER_AREAS } from "./buyer-areas";

describe("BUYER_AREAS", () => {
  it("matches the rows the migration seeds", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "..",
        "backend",
        "supabase",
        "migrations",
        "20261107000001_impact_network.sql",
      ),
      "utf8",
    );
    const block = sql.slice(
      sql.indexOf("insert into public.buyer_areas"),
      sql.indexOf("on conflict (name)"),
    );
    const names = [...block.matchAll(/\('([^']+)',\s*\d+\)/g)].map((m) => m[1]);
    expect([...names].sort()).toEqual([...BUYER_AREAS].sort());
  });
});

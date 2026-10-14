// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LIVE_PROJECT_REF, SIM_PROJECT_REF, assertEnvironment } from "@/lib/environment";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, GRADE_MIX, ITEMS_PER_MONTH } from "./simulation";

const backend = readFileSync(join(__dirname, "../../../backend/sim/config.mjs"), "utf8");

describe("simulation config", () => {
  it("matches the seed's config (backend/sim/config.mjs)", () => {
    expect(backend).toContain(`SIM_PROJECT_REF = "${SIM_PROJECT_REF}"`);
    expect(backend).toContain(`LIVE_PROJECT_REF = "${LIVE_PROJECT_REF}"`);
    expect(backend).toContain(`DEMO_PASSWORD = "${DEMO_PASSWORD}"`);
    for (const a of DEMO_ACCOUNTS) expect(backend).toContain(`email: "${a.email}"`);
    expect(backend).toContain(`ITEMS_PER_MONTH = [${ITEMS_PER_MONTH.join(", ")}]`);
    expect(backend).toContain(
      `A: ${GRADE_MIX.A}, B: ${GRADE_MIX.B}, C: ${GRADE_MIX.C}, D: ${GRADE_MIX.D}`,
    );
  });

  const live = `https://${LIVE_PROJECT_REF}.supabase.co`;
  const sim = `https://${SIM_PROJECT_REF}.supabase.co`;

  it("refuses a real build that points at the simulation database, in either URL", () => {
    expect(() => assertEnvironment(false, [sim, undefined])).toThrow(/simulation/);
    expect(() => assertEnvironment(false, [live, sim])).toThrow(/simulation/);
    expect(() => assertEnvironment(false, [live, live])).not.toThrow();
  });

  it("refuses a simulation build that points at the live database, in either URL", () => {
    expect(() => assertEnvironment(true, [live, sim])).toThrow(/live/);
    expect(() => assertEnvironment(true, [sim, live])).toThrow(/live/);
    expect(() => assertEnvironment(true, [sim, sim])).not.toThrow();
  });
});

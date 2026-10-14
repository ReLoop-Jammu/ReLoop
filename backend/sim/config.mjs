// The simulation environment: a separate Supabase project that holds only
// generated data, so the demo site, preview deployments and journey tests
// never touch production. Nothing here is secret: the project ref and the
// demo logins are shown on the simulation site itself.

/** Supabase project ref of the simulation database (reloop-sim). */
export const SIM_PROJECT_REF = "fskpgbbsvcwhqogjkezj";

/** The production project. The seed refuses to run against it. */
export const LIVE_PROJECT_REF = "cwhujrkvqmmhazntduns";

/** Demo logins, one per role. Simulation only; re-running the seed resets them. */
export const DEMO_PASSWORD = "ReLoop-demo-2026";
export const DEMO_ACCOUNTS = [
  { key: "admin", email: "demo-admin@reloop.demo", name: "Demo Admin", role: "admin" },
  { key: "staff", email: "demo-staff@reloop.demo", name: "Demo Hub Staff", role: "staff" },
  { key: "shop", email: "demo-shop@reloop.demo", name: "Demo Shop Owner", role: "shop_owner" },
  { key: "buyer", email: "demo-buyer@reloop.demo", name: "Demo Buyer", role: "buyer" },
];

/** The business plan's ramp (items received per simulated month). */
export const ITEMS_PER_MONTH = [60, 110, 160, 200, 240, 280];

/** Share of intake by source at steady state (plan: 140 / 60 / 60 / 20 of 280). */
export const SOURCE_MIX = { repair_shop: 140, retailer: 60, institution: 60, household: 20 };

/** Planned grade split until real grading data replaces it. */
export const GRADE_MIX = { A: 0.15, B: 0.25, C: 0.3, D: 0.3 };

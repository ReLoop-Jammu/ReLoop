/**
 * The simulation site's demo logins and assumptions. Mirrors
 * backend/sim/config.mjs (a unit test keeps the two in step). Nothing here is
 * secret: these accounts exist only in the simulation database.
 */
export const DEMO_PASSWORD = "ReLoop-demo-2026";

export const DEMO_ACCOUNTS = [
  { key: "admin", email: "demo-admin@reloop.demo", name: "Demo Admin", role: "admin" },
  { key: "staff", email: "demo-staff@reloop.demo", name: "Demo Hub Staff", role: "staff" },
  { key: "shop", email: "demo-shop@reloop.demo", name: "Demo Shop Owner", role: "shop_owner" },
  { key: "buyer", email: "demo-buyer@reloop.demo", name: "Demo Buyer", role: "buyer" },
] as const;

export const ITEMS_PER_MONTH = [60, 110, 160, 200, 240, 280];
export const SOURCE_MIX = { repair_shop: 140, retailer: 60, institution: 60, household: 20 };
export const GRADE_MIX = { A: 0.15, B: 0.25, C: 0.3, D: 0.3 };

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

export const ITEMS_PER_MONTH = [15, 25, 35, 45, 55, 60];
export const SCRAP_KG_BY_MONTH = [92, 222, 352, 436, 474, 506];
export const PARTNER_SHOPS_BY_MONTH = [10, 18, 26, 32, 36, 40];
export const SOURCE_MIX = { retailer: 60, institution: 25, repair_shop: 15 };
export const GRADE_MIX = { A: 0.15, B: 0.2, C: 0.45, D: 0.2 };

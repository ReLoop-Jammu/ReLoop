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

/** Months simulated, ending today. Every report and KPI is labelled "Simulated month N". */
export const SIM_MONTHS = 6;

/** Business Plan v2, operational ramp by simulated month (counts and kg only). */
export const PARTNER_SHOPS_BY_MONTH = [10, 18, 26, 32, 36, 40];
export const SCRAP_KG_BY_MONTH = [92, 222, 352, 436, 474, 506];
/** Tagged devices received per month (phones, laptops, desktops, monitors). */
export const ITEMS_PER_MONTH = [15, 25, 35, 45, 55, 60];

/** Where tagged devices come from. Institutions start in month 3; repair shops send mostly scrap. */
export const SOURCE_MIX = { retailer: 60, institution: 25, repair_shop: 15 };

/** Device grade split (A 15% / B 20% / C 45% / D 20%). */
export const GRADE_MIX = { A: 0.15, B: 0.2, C: 0.45, D: 0.2 };

/** The public rate card per kg, in paise (published terms; also in the migration). */
export const RATE_CARD_PAISE = { screens: 17000, batteries: 80000, boards: 13000, other: 500 };

/** Simulated split of the scrap weighed at the counter (working values, not plan figures). */
export const SCRAP_KG_SHARE = { screens: 0.28, boards: 0.12, batteries: 0.06, other: 0.54 };

/** The institution lot fee is a published term (Rs 3,000 a lot), in paise. */
export const LOT_FEE_PAISE = 300000;

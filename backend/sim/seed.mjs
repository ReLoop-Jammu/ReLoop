// Seeds the SIMULATION database with about six months of operations built from
// Business Plan v2's operational figures (docs/business-plan-v2-summary.md):
// shops 10 → 40, scrap kg 92 → 506 a month weighed at the counter and paid by
// the public rate card, 15 → 60 devices a month in the A 15 / B 20 / C 45 / D 20
// split, bins and per-bin handovers to the dismantling partner, institution lots,
// and Parts Exchange listings. Every name and amount is simulated.
//
// No plan money figures live in this file. Prices that come from the plan are
// read from backend/sim/local-inputs.json (gitignored, filled in locally); without
// it the placeholders in local-inputs.example.json are used.
//
//   node backend/sim/seed.mjs --sql=out.sql     write the SQL only
//   node backend/sim/seed.mjs --apply           run it on the simulation project
//                                                (needs SUPABASE_ACCESS_TOKEN)
//   --today=YYYY-MM-DD                          end date (default: today)
//
// Deterministic: the same --today and inputs give the same data. Re-runnable: it
// first removes everything a previous run created. It refuses any project but the
// simulation one, and the SQL itself refuses a database holding real accounts.
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  GRADE_MIX,
  ITEMS_PER_MONTH,
  LIVE_PROJECT_REF,
  LOT_FEE_PAISE,
  PARTNER_SHOPS_BY_MONTH,
  RATE_CARD_PAISE,
  SCRAP_KG_BY_MONTH,
  SCRAP_KG_SHARE,
  SIM_MONTHS,
  SIM_PROJECT_REF,
  SOURCE_MIX,
} from "./config.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Local-only inputs (plan figures) if present, else the committed placeholders. */
export function loadLocalInputs({ placeholdersOnly = false } = {}) {
  const local = join(HERE, "local-inputs.json");
  const file =
    !placeholdersOnly && existsSync(local) ? local : join(HERE, "local-inputs.example.json");
  return JSON.parse(readFileSync(file, "utf8"));
}

// ---------------------------------------------------------------- randomness
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(20261014);
// Where simulated buyers are: a handful of Jammu localities, weighted to a few (no real buyers).
const BUYER_AREAS = [
  "Gandhi Nagar",
  "Gandhi Nagar",
  "Trikuta Nagar",
  "Trikuta Nagar",
  "Channi Himmat",
  "Talab Tillo",
  "Bakshi Nagar",
  "Rehari Colony",
  "Collected at the hub",
  "Collected at the hub",
];
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const between = (lo, hi) => lo + rand() * (hi - lo);
const int = (lo, hi) => Math.floor(between(lo, hi + 1));
const chance = (p) => rand() < p;
const weighted = (obj) => {
  const total = Object.values(obj).reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (const [k, w] of Object.entries(obj)) if ((r -= w) <= 0) return k;
  return Object.keys(obj)[0];
};
const hex = (n) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join("");
const uuid = () => {
  const h = hex(32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const roundTo = (paise, step) => Math.max(step, Math.round(paise / step) * step);
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- the catalogue
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** What each source sends as whole, tagged devices. No TVs, printers, UPS units or appliances. */
const CATEGORY_MIX = {
  repair_shop: { phone: 60, laptop: 30, accessory: 10 },
  retailer: { phone: 75, laptop: 20, monitor: 5 },
  institution: { desktop: 40, monitor: 35, laptop: 25 },
};
/** Typical resale price for a working (grade A) unit, in rupees (simulated working values). */
const RESALE_A = { phone: 5000, laptop: 14000, desktop: 7000, monitor: 3200, accessory: 450 };
/** Weight per unit in kg: the measured weight when staff weigh it; labelled estimates elsewhere. */
const WEIGHT = { phone: 0.2, laptop: 2.2, desktop: 8, monitor: 4.5, accessory: 0.3, part: 0.2 };
const MODELS = {
  phone: [
    ["Samsung", "Galaxy M31"],
    ["Redmi", "Note 10"],
    ["Vivo", "Y20"],
    ["Oppo", "A15"],
    ["Realme", "Narzo 30"],
    ["Samsung", "Galaxy A12"],
    ["Apple", "iPhone 8"],
    ["Motorola", "G40"],
  ],
  laptop: [
    ["Lenovo", "ThinkPad T480"],
    ["HP", "250 G7"],
    ["Dell", "Latitude 5490"],
    ["Acer", "Aspire 5"],
    ["Asus", "VivoBook 15"],
    ["Dell", "Inspiron 3501"],
  ],
  desktop: [
    ["Dell", "OptiPlex 3020"],
    ["HP", "ProDesk 400"],
    ["Lenovo", "ThinkCentre M70"],
    ["Acer", "Veriton X"],
  ],
  monitor: [
    ["Dell", "E2216H"],
    ["LG", "22MK400"],
    ["HP", "V22"],
    ["Samsung", "S22F350"],
    ["Acer", "K202"],
  ],
  accessory: [
    ["Logitech", "K120 keyboard"],
    ["HP", "USB mouse"],
    ["Zebronics", "Speaker set"],
    ["Boat", "Wired earphones"],
  ],
};
const PARTS_FROM = {
  phone: ["screen", "battery", "board", "camera", "charging_port"],
  laptop: ["ram", "storage", "screen", "charger", "battery", "board"],
  desktop: ["ram", "storage", "board"],
  monitor: ["board", "screen"],
  accessory: ["other"],
};
/** Part kinds shops list on the Parts Exchange and bring in the to-test bag. */
const EXCHANGE_PARTS = ["board", "screen", "camera", "charging_port", "ram", "storage", "battery"];
const PART_PRICE_RUPEES = {
  screen: 900,
  battery: 450,
  board: 1200,
  ram: 700,
  storage: 900,
  charger: 300,
  motor: 350,
  camera: 500,
  charging_port: 250,
  other: 200,
};
const CHECKS = {
  phone: ["Powers on", "Display", "Touch", "Cameras", "Battery health", "Charging", "Buttons"],
  laptop: ["Powers on", "Display", "Keyboard", "Trackpad", "Battery health", "Ports", "Wi-Fi"],
  desktop: ["Powers on", "Boots", "Ports", "Storage"],
  monitor: ["Powers on", "Display", "No dead pixels", "Inputs"],
  accessory: ["Works", "Cable / connector"],
  part: ["Tested working"],
};
const CLUSTER_MARKETS = ["Bahu Plaza", "Gole Market"]; // Tuesday
const OLD_CITY_MARKETS = ["Raghunath Bazaar", "Residency Road"]; // Friday
const MARKET_POSITION = {
  "Bahu Plaza": [32.7097, 74.8554],
  "Gole Market": [32.7121, 74.8587],
  "Raghunath Bazaar": [32.7268, 74.8596],
  "Residency Road": [32.7302, 74.8641],
};
const LINK_DAILY = {
  "ig-bio": [1, 6],
  "ig-post": [0, 4],
  "ig-story": [0, 5],
  wa: [0, 4],
  drive: [0, 2],
};
const LINK_SOURCE = {
  "ig-bio": ["instagram", "bio"],
  "ig-post": ["instagram", "post"],
  "ig-story": ["instagram", "story"],
  wa: ["whatsapp", "share"],
  drive: ["qr", "print"],
};

// ---------------------------------------------------------------- SQL helpers
const q = (v) => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (Array.isArray(v))
    return `'{${v.map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(",")}}'`;
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
function inserts(table, cols, rows, chunk = 250) {
  const out = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const values = rows
      .slice(i, i + chunk)
      .map((r) => `(${cols.map((c) => q(r[c])).join(", ")})`)
      .join(",\n  ");
    out.push(`insert into ${table} (${cols.join(", ")}) values\n  ${values};`);
  }
  return out;
}
const isoDate = (d) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------- the generator
/**
 * Builds the seed. `auth: "supabase"` writes full Supabase auth rows (with
 * hashed passwords and identities); `auth: "plain"` writes the minimal rows
 * the PGlite test shim has. `localInputs` carries the plan-derived prices.
 */
export function buildSeed({ today = new Date(), auth = "supabase", localInputs } = {}) {
  const inputs = localInputs ?? loadLocalInputs();
  rand = mulberry32(20261014);
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 9),
  );
  const start = new Date(end.getTime() - 180 * DAY);
  const before = (t) => t.getTime() <= end.getTime();
  const at = (t) => new Date(Math.min(t.getTime(), end.getTime()));
  const monthOf = (t) =>
    Math.min(SIM_MONTHS - 1, Math.max(0, Math.floor((t - start) / (30 * DAY))));
  const partBuyPaise = (type) => (inputs.tested_part_buy_rupees?.[type] ?? 30) * 100;
  const partResalePaise = (type) => PART_PRICE_RUPEES[type] * 100;

  // Accounts: demo logins plus the other partner shops' owners.
  const accounts = DEMO_ACCOUNTS.map((a) => ({
    ...a,
    id: uuid(),
    phone: "9000000" + String(int(100, 999)),
  }));
  const byKey = Object.fromEntries(accounts.map((a) => [a.key, a]));

  // Partners: 40 by the end, joining 10 → 18 → 26 → 32 → 36 → 40. The first two
  // months are the Tuesday route (Gandhi Nagar cluster); the Friday route (old
  // city) and five retailers or exchange stores arrive from month 3.
  const joinMonth = (i) => PARTNER_SHOPS_BY_MONTH.findIndex((n) => i < n);
  const RETAILER_AT = new Set([20, 22, 25, 27, 30]);
  const partners = Array.from({ length: PARTNER_SHOPS_BY_MONTH.at(-1) }, (_, i) => {
    const jm = joinMonth(i);
    const joined = new Date(start.getTime() + (jm * 30 + int(0, 27)) * DAY);
    const friday = jm >= 2 && i % 5 >= 2;
    const market = friday ? OLD_CITY_MARKETS[i % 2] : CLUSTER_MARKETS[i % 2];
    return {
      id: uuid(),
      type: RETAILER_AT.has(i) ? "retailer" : "repair_shop",
      name: `Simulated Shop ${String(i + 1).padStart(2, "0")}`,
      owner: `Owner ${String(i + 1).padStart(2, "0")} (simulated)`,
      phone: "90000" + String(10000 + i),
      market,
      route_day: friday ? "fri" : "tue",
      is_repair_partner: i % 4 === 0 && !RETAILER_AT.has(i),
      status: "active",
      joined_at: joined,
      notes: "Simulated partner.",
      label: i === 27 ? "Exchange store" : "",
      shop_owner_id: null,
    };
  });
  const repairPartners = partners.filter((p) => p.is_repair_partner);
  const institutions = [
    ["Simulated College A", "college", "Lab in-charge (simulated)", "9000020001"],
    ["Simulated School B", "school", "Admin office (simulated)", "9000020002"],
    ["Simulated Office C", "office", "IT desk (simulated)", "9000020003"],
  ].map(([name, type, contact_name, phone]) => ({
    id: uuid(),
    name,
    type,
    contact_name,
    phone,
    email: "",
    is_anchor: true,
    notes: "Simulated anchor institution.",
    named_publicly: false,
    named_consent_at: null,
  }));

  const items = [];
  const events = [];
  const repairs = [];
  const ledger = [];
  const declarations = [];
  let counter = 0;
  const nextId = () => `RL-JMU-${String(++counter).padStart(4, "0")}`;
  const event = (item_id, t, type, note = "") => {
    if (before(t)) events.push({ item_id, at: t, type, note: note ?? "" });
  };
  const declare = (seller_label, t, extra = {}) => {
    const d = {
      id: uuid(),
      confirmed_at: t,
      declaration_version: "v1",
      seller_label,
      partner_id: null,
      tags: [],
      staff_id: byKey.staff.id,
      shop_submission_id: null,
      note: "",
      ...extra,
    };
    declarations.push(d);
    return d;
  };

  // A fresh item row with every column the seed writes.
  const baseItem = (over) => ({
    id: nextId(),
    received_at: start,
    source_type: "repair_shop",
    partner_id: null,
    institution_id: null,
    source_name: "",
    category: "phone",
    part_type: null,
    brand: "",
    model: "",
    description: "",
    has_battery: false,
    weight_kg: null,
    grade: null,
    graded_at: null,
    checklist: {},
    faults: "",
    wipe_required: false,
    wipe_method: null,
    wiped_at: null,
    rack: "",
    buy_mode: "cash",
    buy_paise: 0,
    purchase_payment_method: "not_paid",
    purchase_paid_at: null,
    expected_resale_paise: null,
    list_paise: null,
    current_paise: null,
    price_cut_at: null,
    status: "received",
    listed_at: null,
    sold_at: null,
    sold_paise: null,
    buyer_area: null,
    fulfilment: null,
    parent_id: null,
    handover_id: null,
    ownership_confirmed_at: null,
    ownership_confirmed_by: null,
    locked_device: false,
    weighin_id: null,
    institution_lot_id: null,
    listed_by_partner_id: null,
    commission_pct: null,
    partner_reminded_at: null,
    ...over,
  });

  // Day-30 and day-45 stock rules, applied the way apply_stock_rules does.
  function sell(item, listedAt, meanDays, pSell) {
    item.status = "listed";
    item.listed_at = listedAt;
    event(item.id, listedAt, "status:listed", `Listed at ₹${item.list_paise / 100}`);
    if (!before(listedAt)) {
      item.status = "graded";
      item.listed_at = null;
      return;
    }
    const sells = chance(pSell);
    const days = -Math.log(1 - rand()) * meanDays;
    const soldAt = new Date(listedAt.getTime() + days * DAY + int(1, 8) * HOUR);
    if (item.category === "part") {
      // A part unsold for 30 days: one 25% cut (the shop is reminded instead for its own parts).
      const cutAt = new Date(listedAt.getTime() + 30 * DAY);
      if (before(cutAt) && (!sells || soldAt > cutAt)) {
        if (item.source_type === "partner_listing") {
          item.partner_reminded_at = cutAt;
        } else {
          item.current_paise = Math.max(1000, Math.round((item.list_paise * 0.75) / 1000) * 1000);
          item.price_cut_at = cutAt;
          event(
            item.id,
            cutAt,
            "price_changed",
            // The same format the database writes (log_item_change), so price history reads it.
            `${Math.floor(item.list_paise / 100)} → ${Math.floor(item.current_paise / 100)}`,
          );
        }
      }
    } else {
      // A device unsold for 45 days becomes C and is stripped for parts.
      const stripAt = new Date(listedAt.getTime() + 45 * DAY);
      if (before(stripAt) && (!sells || soldAt > stripAt)) {
        item.grade = "C";
        item.status = "stripping";
        event(item.id, stripAt, "status:stripping", "Unsold after 45 days: moved to C for parts");
        strip(item, stripAt);
        return;
      }
    }
    if (sells && before(soldAt)) {
      item.status = "sold";
      item.sold_at = soldAt;
      item.sold_paise = item.current_paise;
      item.buyer_area =
        BUYER_AREAS[Number(String(item.id).replace(/\D/g, "")) % BUYER_AREAS.length];
      item.fulfilment = chance(0.38) ? "delivery_jammu" : "pickup";
      event(item.id, soldAt, "status:sold", `Sold for ₹${item.sold_paise / 100}`);
    } else if (chance(0.05)) {
      item.status = "reserved";
    }
  }

  // A tagged D device (or a stripped shell) goes to the D devices bin with its weight.
  function toScrap(item, t) {
    item.status = "in_scrap_cage";
    item.cage_at = t;
    event(item.id, t, "status:in_scrap_cage", `Into the D devices bin (${item.weight_kg} kg)`);
    if (before(t))
      ledger.push({
        at: t,
        bin: "d_devices",
        kg: Number(item.weight_kg),
        source: "device_d",
        weighin_id: null,
        item_id: item.id,
        estimated: false,
        note: "",
        handover_id: null,
      });
  }

  // Parts pulled from a C device, each tested and tagged; boards and storage are wiped first.
  function strip(item, from) {
    const t = new Date(from.getTime() + int(6, 48) * HOUR);
    if (!before(t)) {
      item.status = "stripping";
      return;
    }
    const kinds = PARTS_FROM[item.category];
    const n = Math.min(kinds.length, int(1, 3));
    for (const partType of [...kinds].sort(() => rand() - 0.5).slice(0, n)) {
      const price = roundTo(partResalePaise(partType) * between(0.7, 1.3), 5000);
      const wipe = partType === "storage" || (partType === "board" && item.category !== "monitor");
      const part = baseItem({
        received_at: t,
        source_type: "stripped",
        category: "part",
        part_type: partType,
        brand: item.brand,
        model: item.model,
        description: `${partType === "storage" ? "Storage drive" : partType[0].toUpperCase() + partType.slice(1).replace("_", " ")} removed from ${item.brand} ${item.model} (${item.id}). Simulated item.`,
        has_battery: partType === "battery",
        weight_kg: 0.2,
        grade: "C",
        graded_at: t,
        checklist: { "Tested working": true },
        wipe_required: wipe,
        wipe_method: wipe ? "drive_wipe" : null,
        wiped_at: wipe ? t : null,
        buy_mode: "free",
        expected_resale_paise: price,
        list_paise: price,
        current_paise: price,
        status: "graded",
        parent_id: item.id,
        ownership_confirmed_at: null,
      });
      items.push(part);
      event(part.id, t, "received", `Part from ${item.id}`);
      event(part.id, t, "graded", "Tested part");
      sell(part, new Date(t.getTime() + int(6, 40) * HOUR), 20, 0.7);
    }
    event(item.id, t, "note", `${n} part(s) removed; the shell goes to the D devices bin`);
    item.weight_kg = r2(item.weight_kg * 0.7);
    toScrap(item, t);
  }

  // ----- Whole devices: retailers' trade-ins and dead handsets, institutions' old PCs.
  const lots = new Map();
  const lotFor = (inst, received) => {
    const key = `${monthOf(received)}-${inst.id}`;
    if (!lots.has(key))
      lots.set(key, {
        id: uuid(),
        institution_id: inst.id,
        lot_date: isoDate(received),
        date: received,
        items: [],
        declaration: declare(inst.name, received, { note: "Institution lot" }),
      });
    return lots.get(key);
  };
  ITEMS_PER_MONTH.forEach((count, m) => {
    const monthStart = start.getTime() + m * 30 * DAY;
    for (let n = 0; n < count; n++) {
      // Months 1-2 are repair shops only; retailers and institutions arrive from month 3.
      const source = m < 2 ? "repair_shop" : weighted(SOURCE_MIX);
      const category = weighted(CATEGORY_MIX[source]);
      const [brand, model] = pick(MODELS[category]);
      const received = new Date(monthStart + rand() * 30 * DAY);
      if (!before(received)) continue;
      const grade = weighted(GRADE_MIX);
      const resaleA = roundTo(RESALE_A[category] * between(0.65, 1.35) * 100, 5000);
      const resale = grade === "B" ? roundTo(resaleA * 0.75, 5000) : resaleA;
      const share = inputs.buy_share_of_resale ?? { A: 0.4, B: 0.2 };
      const [cLo, cHi] = inputs.c_device_buy_rupees ?? [10, 20];
      const buy =
        grade === "A"
          ? roundTo(resale * share.A, 5000)
          : grade === "B"
            ? roundTo(resale * share.B, 5000)
            : grade === "C"
              ? int(cLo, cHi) * 1000
              : 0;
      const active = partners.filter((p) => p.joined_at <= received);
      const pool = active.filter((p) => p.type === source);
      const partner = source === "institution" ? null : pick(pool.length ? pool : active);
      const institution = source === "institution" ? pick(institutions) : null;
      const lot = institution ? lotFor(institution, received) : null;
      const wipe = ["phone", "laptop", "desktop"].includes(category);
      const graded = new Date(received.getTime() + int(2, 20) * HOUR);
      const checks = Object.fromEntries(
        CHECKS[category].map((c) => [c, grade === "A" ? true : !chance(0.35)]),
      );
      const item = baseItem({
        received_at: received,
        source_type: source,
        partner_id: partner?.id ?? null,
        institution_id: institution?.id ?? null,
        source_name: partner?.name ?? institution?.name ?? "",
        category,
        brand,
        model,
        description: `${brand} ${model}. Simulated item.`,
        has_battery: ["phone", "laptop"].includes(category),
        weight_kg: r2(WEIGHT[category] * between(0.8, 1.2)),
        grade: before(graded) ? grade : null,
        graded_at: before(graded) ? graded : null,
        checklist: before(graded) ? checks : {},
        faults:
          grade === "B"
            ? pick([
                "Cracked screen",
                "Weak battery",
                "Charging port loose",
                "Keyboard keys missing",
              ])
            : grade === "D"
              ? "Dead, does not power on"
              : "",
        wipe_required: wipe,
        buy_mode: grade === "D" ? "free" : "cash",
        buy_paise: buy,
        purchase_payment_method: buy > 0 ? (chance(0.85) ? "upi" : "cash") : "not_paid",
        purchase_paid_at: buy > 0 ? received : null,
        expected_resale_paise: grade === "D" ? null : resale,
        status: before(graded) ? "graded" : "received",
        institution_lot_id: lot?.id ?? null,
        ownership_confirmed_at: received,
        ownership_confirmed_by: byKey.staff.id,
      });
      items.push(item);
      lot?.items.push(item);
      event(item.id, received, "received", null);
      if (!before(graded)) continue;
      event(item.id, graded, "graded", `Grade ${grade}`);

      let ready = graded;
      if (wipe) {
        // Wiped, or its storage destroyed (D), before anything is stripped or sold.
        const wiped = new Date(graded.getTime() + int(1, 18) * HOUR);
        if (before(wiped)) {
          item.wiped_at = wiped;
          item.wipe_method =
            grade === "D" ? "drilled" : category === "phone" ? "reset_overwrite" : "drive_wipe";
          event(item.id, wiped, "note", "Data wipe recorded");
          ready = wiped;
        } else continue;
      }

      if (grade === "A") {
        item.list_paise = resale;
        item.current_paise = resale;
        sell(item, new Date(ready.getTime() + int(3, 40) * HOUR), 14, 0.85);
      } else if (grade === "B") {
        const partnerR = pick(repairPartners);
        const sent = new Date(ready.getTime() + int(4, 30) * HOUR);
        if (!before(sent)) continue;
        const back = new Date(sent.getTime() + int(2, 6) * DAY);
        const fixed = chance(0.88);
        repairs.push({
          id: uuid(),
          item_id: item.id,
          partner_id: partnerR.id,
          fault: item.faults,
          fee_paise: int(35, 75) * 1000,
          sent_at: sent,
          returned_at: before(back) ? back : null,
          outcome: before(back) ? (fixed ? "fixed" : "not_fixable") : null,
        });
        item.status = "out_for_repair";
        event(item.id, sent, "status:out_for_repair", `Sent to ${partnerR.name}: ${item.faults}`);
        if (!before(back)) continue;
        if (fixed) {
          item.status = "graded";
          event(item.id, back, "status:graded", "Back from repair: fixed");
          item.list_paise = resale;
          item.current_paise = resale;
          sell(item, new Date(back.getTime() + int(3, 30) * HOUR), 16, 0.8);
        } else {
          item.grade = "C";
          event(item.id, back, "status:stripping", "Back from repair: not fixable, moved to C");
          strip(item, back);
        }
      } else if (grade === "C") {
        strip(item, ready);
      } else {
        toScrap(item, new Date(graded.getTime() + int(1, 20) * HOUR));
      }
    }
  });

  // ----- Weigh-ins: the weekly route. Counter weight is the paid weight; the rate
  // card (public) prices it. Monthly totals follow the plan's kg ramp.
  const weighins = [];
  const payoutRows = []; // every payout, numbered chronologically at the end
  const tested = []; // parts from the "to test" bags
  const routeDates = (m) => {
    const out = [];
    for (let d = 0; d < 30; d++) {
      const day = new Date(start.getTime() + (m * 30 + d) * DAY);
      const dow = day.getUTCDay();
      if (dow === 2 || (dow === 5 && m >= 2)) out.push(day);
    }
    return out;
  };
  SCRAP_KG_BY_MONTH.forEach((target, m) => {
    const visits = [];
    for (const day of routeDates(m)) {
      const wd = day.getUTCDay() === 2 ? "tue" : "fri";
      for (const p of partners) {
        if (p.route_day !== wd || p.joined_at > day) continue;
        // Repair shops every week (most weeks); retailers about once a month.
        if (!chance(p.type === "retailer" ? 0.25 : 0.85)) continue;
        visits.push({
          partner: p,
          at: new Date(day.getTime() + 5.5 * HOUR + int(0, 240) * 60_000),
          raw: between(0.5, 1.5),
        });
      }
    }
    const total = visits.reduce((a, v) => a + v.raw, 0) || 1;
    const month = visits.map((v) => {
      const kg = (v.raw / total) * target;
      return {
        ...v,
        kg: {
          screens: r1(kg * SCRAP_KG_SHARE.screens * between(0.8, 1.2)),
          boards: r1(kg * SCRAP_KG_SHARE.boards * between(0.8, 1.2)),
          batteries: r1(kg * SCRAP_KG_SHARE.batteries * between(0.8, 1.2)),
          other: 0,
        },
        total: kg,
      };
    });
    // "Everything else" takes the remainder, so the month adds up to the plan's kg.
    for (const w of month)
      w.kg.other = Math.max(0.1, r1(w.total - w.kg.screens - w.kg.boards - w.kg.batteries));
    const sum = month.reduce(
      (a, w) => a + w.kg.screens + w.kg.boards + w.kg.batteries + w.kg.other,
      0,
    );
    if (month.length) {
      const big = month.reduce((a, b) => (b.total > a.total ? b : a));
      big.kg.other = Math.max(0.1, r1(big.kg.other + (target - sum)));
    }
    for (const w of month) {
      if (!before(w.at)) continue;
      const decl = declare(w.partner.name, w.at, {
        partner_id: w.partner.id,
        note: "Scrap weigh-in",
      });
      const toTest = chance(0.15) ? int(1, 3) : 0;
      const amount = Math.round(
        w.kg.screens * RATE_CARD_PAISE.screens +
          w.kg.boards * RATE_CARD_PAISE.boards +
          w.kg.batteries * RATE_CARD_PAISE.batteries +
          w.kg.other * RATE_CARD_PAISE.other,
      );
      const row = {
        id: uuid(),
        partner_id: w.partner.id,
        pickup_id: null,
        weighed_at: w.at,
        screens_kg: w.kg.screens,
        boards_kg: w.kg.boards,
        batteries_kg: w.kg.batteries,
        other_kg: w.kg.other,
        rates_paise: RATE_CARD_PAISE,
        amount_paise: amount,
        to_test_count: toTest,
        to_test_note: toTest ? "Likely-working parts in the to-test bag (simulated)" : "",
        ownership_declaration_id: decl.id,
        swap_declaration: toTest > 0,
        partner: w.partner,
      };
      weighins.push(row);
      for (const [bin, kg] of Object.entries({
        screens: w.kg.screens,
        boards: w.kg.boards,
        batteries: w.kg.batteries,
        other: w.kg.other,
      }))
        if (kg > 0)
          ledger.push({
            at: w.at,
            bin,
            kg,
            source: "weighin",
            weighin_id: row.id,
            item_id: null,
            estimated: false,
            note: "",
            handover_id: null,
          });
      const method = chance(0.9) ? "upi" : "cash";
      payoutRows.push({
        at: w.at,
        weighin_id: row.id,
        shop_owner_id: w.partner.shop_owner_id,
        partner_id: w.partner.id,
        amount_paise: amount,
        method,
        paid_at: isoDate(w.at),
        reference: method === "upi" ? `SIM-UPI-${int(100000, 999999)}` : "",
        internal_note: "Simulated payment",
        line: "scrap",
      });
      // The to-test bag: tested within 24 hours, then paid as parts on its own receipt line.
      const bag = [];
      for (let k = 0; k < toTest; k++) {
        const partType = pick(EXCHANGE_PARTS);
        const t = new Date(w.at.getTime() + int(4, 22) * HOUR);
        if (!before(t)) continue;
        if (chance(0.3)) {
          // Failed the test: into the bin and paid at the kg rate (already in the counter weight).
          ledger.push({
            at: t,
            bin: partType === "board" ? "boards" : "other",
            kg: r1(between(0.1, 0.3)),
            source: "part_fail",
            weighin_id: row.id,
            item_id: null,
            estimated: false,
            note: "Failed the test; kg already paid at the counter",
            handover_id: null,
          });
          continue;
        }
        const wipe = partType === "board" || partType === "storage";
        const price = roundTo(partResalePaise(partType) * between(0.9, 1.4), 5000);
        const part = baseItem({
          received_at: t,
          source_type: "repair_shop",
          partner_id: w.partner.id,
          source_name: w.partner.name,
          category: "part",
          part_type: partType,
          brand: "",
          model: "",
          description: `${partType.replace("_", " ")} from the to-test bag. Simulated item.`,
          has_battery: partType === "battery",
          weight_kg: 0.2,
          grade: "C",
          graded_at: t,
          checklist: { "Tested working": true },
          wipe_required: wipe,
          wipe_method: wipe ? "reset_overwrite" : null,
          wiped_at: wipe ? t : null,
          buy_paise: partBuyPaise(partType),
          purchase_payment_method: "upi",
          purchase_paid_at: new Date(t.getTime() + 2 * DAY),
          expected_resale_paise: price,
          list_paise: price,
          current_paise: price,
          status: "graded",
          weighin_id: row.id,
          ownership_confirmed_at: w.at,
          ownership_confirmed_by: byKey.staff.id,
        });
        items.push(part);
        tested.push(part);
        bag.push(part);
        event(part.id, t, "received", `From ${w.partner.name}'s to-test bag`);
        event(part.id, t, "graded", "Tested part");
        sell(part, new Date(t.getTime() + int(6, 40) * HOUR), 18, 0.7);
      }
      if (bag.length) {
        const payAt = at(new Date(w.at.getTime() + 7 * DAY));
        if (payAt.getTime() > w.at.getTime())
          payoutRows.push({
            at: payAt,
            weighin_id: row.id,
            shop_owner_id: w.partner.shop_owner_id,
            partner_id: w.partner.id,
            amount_paise: bag.reduce((a, p) => a + p.buy_paise, 0),
            method: "upi",
            paid_at: isoDate(payAt),
            reference: `SIM-UPI-${int(100000, 999999)}`,
            internal_note: "Simulated payment for tested parts",
            line: "tested_parts",
          });
      }
    }
  });
  // A hub re-weigh difference is logged and never charged back.
  const rw = weighins[Math.floor(weighins.length / 2)];
  if (rw)
    ledger.push({
      at: new Date(rw.weighed_at.getTime() + 3 * HOUR),
      bin: "other",
      kg: -0.4,
      source: "reweigh",
      weighin_id: rw.id,
      item_id: null,
      estimated: false,
      note: "Hub re-weigh was 0.4 kg lower; not charged back (simulated)",
      handover_id: null,
    });

  // ----- Institution lots: Rs 3,000 a lot (the published fee), the fee and the
  // equipment payment on their own receipts, dead e-waste straight to the partner.
  const handovers = [];
  let hNo = 0;
  const feeRows = [];
  const lotRows = [];
  for (const lot of [...lots.values()].sort((a, b) => a.date - b.date)) {
    const feeAt = at(new Date(lot.date.getTime() + 1 * DAY));
    const handoverAt = at(new Date(lot.date.getTime() + 2 * DAY));
    const h = {
      id: uuid(),
      date: isoDate(handoverAt),
      recycler: "VRRG Group, Gangyal",
      on_behalf_of: institutions.find((i) => i.id === lot.institution_id).name,
      kg_by_category: {
        screens: r1(between(5, 25)),
        boards: r1(between(10, 30)),
        other: r1(between(15, 60)),
      },
      battery_kg: 0,
      item_ids: [],
      receipt_no: `SIM-VRRG-INST-${String(++hNo).padStart(3, "0")}`,
      rate_per_kg_paise: null,
      amount_paise: null,
      notes:
        "Dead e-waste referred straight to the dismantling partner for this institution. Includes equipment ReLoop does not take (simulated).",
      kind: "institution_lot",
      bins: [],
      rates_paise: null,
      created_at: handoverAt,
    };
    handovers.push(h);
    const receiptYear = feeAt.getUTCFullYear();
    feeRows.push({ year: receiptYear, lot });
    lotRows.push({
      id: lot.id,
      institution_id: lot.institution_id,
      request_id: null,
      lot_date: lot.lot_date,
      fee_paise: LOT_FEE_PAISE,
      fee_receipt_no: null,
      fee_received_at: isoDate(feeAt),
      fee_method: "upi",
      ownership_declaration_id: lot.declaration.id,
      handover_id: h.id,
      created_at: lot.date,
    });
    const equipment = lot.items.reduce((a, i) => a + i.buy_paise, 0);
    for (const i of lot.items) lot.declaration.tags.push(i.id);
    if (equipment > 0)
      payoutRows.push({
        at: feeAt,
        institution_lot_id: lot.id,
        shop_owner_id: null,
        partner_id: null,
        amount_paise: equipment,
        method: "upi",
        paid_at: isoDate(feeAt),
        reference: `SIM-UPI-${int(100000, 999999)}`,
        internal_note: "Simulated payment for the lot's equipment",
        line: "lot_equipment",
      });
  }
  // Fee receipts RL-FEE-YYYY-NNNN, in lot order.
  const feeCount = {};
  for (const f of feeRows) {
    feeCount[f.year] = (feeCount[f.year] ?? 0) + 1;
    lotRows.find((l) => l.id === f.lot.id).fee_receipt_no =
      `RL-FEE-${f.year}-${String(feeCount[f.year]).padStart(4, "0")}`;
  }

  // ----- Bin handovers to the dismantling partner: any bin at 100 kg or 14 days;
  // batteries every week whatever the quantity.
  const BINS = ["screens", "boards", "other", "d_devices", "batteries"];
  let lastRowIndex = 0;
  ledger.sort((a, b) => a.at - b.at);
  void lastRowIndex;
  for (let d = start.getTime(); d <= end.getTime(); d += DAY) {
    const day = new Date(d + 6 * HOUR);
    const due = [];
    for (const bin of BINS) {
      const open = ledger.filter((l) => l.bin === bin && !l.handover_id && l.at <= day);
      const kg = open.reduce((a, l) => a + l.kg, 0);
      if (kg <= 0) continue;
      const oldest = Math.min(...open.map((l) => l.at.getTime()));
      const waited = day.getTime() - oldest;
      if (bin === "batteries" ? waited >= 7 * DAY : kg >= 100 || waited >= 14 * DAY) due.push(bin);
    }
    if (!due.length) continue;
    const h = {
      id: uuid(),
      date: isoDate(day),
      recycler: "VRRG Group, Gangyal",
      on_behalf_of: null,
      kg_by_category: {},
      battery_kg: 0,
      item_ids: [],
      receipt_no: `SIM-VRRG-${String(++hNo).padStart(4, "0")}`,
      rate_per_kg_paise: null,
      amount_paise: null,
      notes: `Simulated handover (Simulated month ${monthOf(day) + 1}).`,
      kind: "hub",
      bins: due,
      rates_paise: inputs.vrrg_rates_paise ?? null,
      created_at: day,
    };
    for (const bin of due) {
      const rows = ledger.filter((l) => l.bin === bin && !l.handover_id && l.at <= day);
      const kg = r2(rows.reduce((a, l) => a + l.kg, 0));
      for (const l of rows) l.handover_id = h.id;
      if (bin === "batteries") h.battery_kg = kg;
      else h.kg_by_category[bin] = kg;
      if (bin === "d_devices")
        for (const l of rows) {
          const it = items.find((i) => i.id === l.item_id);
          if (it) {
            it.status = "handed_over";
            it.handover_id = h.id;
            h.item_ids.push(it.id);
            event(
              it.id,
              day,
              "status:handed_over",
              `Handed to VRRG Group (receipt ${h.receipt_no})`,
            );
          }
        }
    }
    handovers.push(h);
  }
  handovers.sort((a, b) => a.created_at - b.created_at);

  // ----- Jammu Parts Exchange: listings from the shops with a linked account.
  const shopAccounts = [
    {
      ...byKey.shop,
      shop_name: "Demo Repairs (simulated)",
      market: "Bahu Plaza",
      status: "verified",
    },
    ...Array.from({ length: 4 }, (_, i) => ({
      key: `shop${i + 2}`,
      email: `shop${i + 2}@reloop.demo`,
      name: `Shop Owner ${i + 2} (simulated)`,
      role: "shop_owner",
      id: uuid(),
      phone: "9000030" + String(100 + i),
      shop_name: `Simulated Partner ${i + 2}`,
      market: CLUSTER_MARKETS[(i + 1) % 2],
      status: i === 3 ? "pending" : "verified",
    })),
  ];
  // The first verified shops are partners with a linked account (the first partners are Tuesday-route shops).
  shopAccounts
    .filter((s) => s.status === "verified")
    .forEach((s, i) => {
      partners[i].shop_owner_id = s.id;
      partners[i].name = s.shop_name;
      partners[i].market = s.market;
      partners[i].route_day = "tue";
    });
  const linked = partners.filter((p) => p.shop_owner_id);
  const listings = [];
  const exchangeSales = [];
  const LISTINGS_BY_MONTH = [2, 3, 4, 5, 5, 6];
  LISTINGS_BY_MONTH.forEach((count, m) => {
    for (let k = 0; k < count; k++) {
      const p = pick(linked);
      const submittedAt = new Date(
        start.getTime() + (m * 30 + int(1, 27)) * DAY + int(6, 17) * HOUR,
      );
      if (!before(submittedAt)) continue;
      const partType = pick(EXCHANGE_PARTS);
      const ask = roundTo(partResalePaise(partType) * between(1.0, 1.5), 5000);
      const recent = end.getTime() - submittedAt.getTime() < 3 * DAY;
      const listing = {
        id: uuid(),
        partner_id: p.id,
        shop_owner_id: p.shop_owner_id,
        part_type: partType,
        brand: "",
        model: "",
        description: `${partType.replace("_", " ")} harvested by the shop. Simulated listing.`,
        asking_paise: ask,
        agree_named: true,
        photos: [],
        status: "submitted",
        reject_reason: "",
        item_id: null,
        created_at: submittedAt,
        reviewed_at: null,
      };
      listings.push(listing);
      if (recent) continue; // still waiting for the route
      const received = new Date(submittedAt.getTime() + int(1, 4) * DAY);
      if (!before(received)) continue;
      if (listings.length % 11 === 0) {
        listing.status = "rejected";
        listing.reject_reason = "Failed the test twice (simulated)";
        listing.reviewed_at = at(new Date(received.getTime() + 1 * DAY));
        continue;
      }
      const wipe = partType === "board" || partType === "storage";
      const tested_ = new Date(received.getTime() + int(4, 22) * HOUR);
      const item = baseItem({
        received_at: received,
        source_type: "partner_listing",
        listed_by_partner_id: p.id,
        commission_pct: 12,
        source_name: p.name,
        category: "part",
        part_type: partType,
        description: listing.description,
        has_battery: partType === "battery",
        weight_kg: 0.2,
        grade: before(tested_) ? "C" : null,
        graded_at: before(tested_) ? tested_ : null,
        checklist: before(tested_) ? { "Tested working": true } : {},
        wipe_required: wipe,
        wipe_method: wipe && before(tested_) ? "reset_overwrite" : null,
        wiped_at: wipe && before(tested_) ? tested_ : null,
        buy_mode: "free",
        buy_paise: 0,
        expected_resale_paise: ask,
        list_paise: ask,
        current_paise: ask,
        status: before(tested_) ? "graded" : "received",
        ownership_confirmed_at: received,
        ownership_confirmed_by: byKey.staff.id,
      });
      items.push(item);
      listing.item_id = item.id;
      listing.status = "at_hub";
      event(item.id, received, "received", `Listed by ${p.name} on the Parts Exchange`);
      if (!before(tested_)) continue;
      event(item.id, tested_, "graded", "Tested part");
      const listedAt = new Date(tested_.getTime() + int(2, 30) * HOUR);
      if (!before(listedAt)) continue;
      listing.status = "approved";
      listing.reviewed_at = listedAt;
      sell(item, listedAt, 15, 0.6);
      if (item.status === "sold") {
        const commission = Math.round((item.sold_paise * 12) / 100);
        exchangeSales.push({
          id: uuid(),
          item_id: item.id,
          partner_id: p.id,
          sold_paise: item.sold_paise,
          commission_pct: 12,
          commission_paise: commission,
          shop_share_paise: item.sold_paise - commission,
          sold_at: item.sold_at,
          payout_due_on: isoDate(new Date(item.sold_at.getTime() + 7 * DAY)),
          status: "sold",
          partner: p,
        });
      }
    }
  });
  // The shop is paid after the 7-day return window.
  for (const s of exchangeSales) {
    const payAt = new Date(s.sold_at.getTime() + 8 * DAY);
    if (!before(payAt)) continue;
    s.status = "paid";
    payoutRows.push({
      at: payAt,
      exchange_sale_id: s.id,
      shop_owner_id: s.partner.shop_owner_id,
      partner_id: s.partner_id,
      amount_paise: s.shop_share_paise,
      method: "upi",
      paid_at: isoDate(payAt),
      reference: `SIM-UPI-${int(100000, 999999)}`,
      internal_note: "Simulated payment of the shop's share",
      line: "part_sale",
    });
  }

  // ----- Public requests: reservations for many sales, questions, institution pickups.
  const requests = [];
  const req = (kind, fields, status, created, itemId = null) => {
    if (!before(created)) return;
    requests.push({
      id: uuid(),
      kind,
      fields,
      status,
      item_id: itemId,
      created_at: created,
      handled_at: status === "new" ? null : created,
      closed_at: ["done", "sold", "cancelled"].includes(status)
        ? at(new Date(created.getTime() + int(4, 72) * HOUR))
        : null,
    });
  };
  let personNo = 0;
  const person = () => ({
    name: `Simulated Buyer ${String(++personNo).padStart(3, "0")}`,
    phone: "90001" + String(10000 + personNo),
  });
  for (const it of items) {
    const afterListing = (t) =>
      it.listed_at ? new Date(Math.max(t.getTime(), it.listed_at.getTime() + HOUR)) : t;
    if (it.status === "sold" && chance(0.4))
      req(
        "reservation",
        { ...person(), item: it.id, fulfilment: it.fulfilment },
        "sold",
        afterListing(new Date(it.sold_at.getTime() - int(4, 48) * HOUR)),
        it.id,
      );
    else if (it.status === "reserved")
      req(
        "reservation",
        { ...person(), item: it.id, fulfilment: "Pick up from the hub (free)" },
        chance(0.5) ? "new" : "contacted",
        afterListing(new Date(end.getTime() - int(2, 60) * HOUR)),
        it.id,
      );
    if (it.listed_at && chance(0.12))
      req(
        "enquiry",
        { ...person(), item: it.id, question: "Is the battery original?" },
        chance(0.85) ? "done" : "new",
        new Date(it.listed_at.getTime() + int(6, 120) * HOUR),
        it.id,
      );
  }
  for (let m = 2; m < SIM_MONTHS; m++)
    for (const inst of institutions) {
      const t = new Date(start.getTime() + (m * 30 + int(2, 25)) * DAY);
      req(
        "institution_pickup",
        {
          institution: inst.name,
          contact: inst.contact_name,
          phone: inst.phone,
          items: "Old desktops, laptops and monitors",
        },
        m === 5 && chance(0.5) ? "new" : "done",
        t,
      );
    }

  // Reference prices (labelled simulated) for every category and the parts.
  const references = [
    ...Object.entries(RESALE_A).map(([category, rupees]) => ({
      category,
      part_type: null,
      low_paise: roundTo(rupees * 0.75 * 100, 5000),
      typical_paise: rupees * 100,
      high_paise: roundTo(rupees * 1.3 * 100, 5000),
      source: "Simulated reference (working values for the simulation)",
      checked_on: isoDate(new Date(end.getTime() - int(5, 40) * DAY)),
    })),
    ...[
      ["ram", 600, 900, 1300],
      ["storage", 800, 1200, 1700],
      ["screen", 1200, 1800, 2600],
      ["battery", 500, 800, 1200],
      ["charger", 250, 400, 600],
      ["board", 1500, 2200, 3200],
      ["camera", 600, 900, 1400],
      ["charging_port", 250, 400, 700],
    ].map(([part, lo, mid, hi]) => ({
      category: "part",
      part_type: part,
      low_paise: lo * 100,
      typical_paise: mid * 100,
      high_paise: hi * 100,
      source: "Simulated reference (parts)",
      checked_on: isoDate(new Date(end.getTime() - int(5, 40) * DAY)),
    })),
  ];
  for (const it of items)
    if (it.status === "listed" && it.category !== "part" && chance(0.4)) {
      it.new_price_paise = roundTo(RESALE_A[it.category] * between(2.2, 3.2) * 100, 10000);
      it.new_price_source = "Simulated: typical price new in Jammu shops";
      it.new_price_checked_on = isoDate(new Date(end.getTime() - int(3, 60) * DAY));
    }

  // The demo buyer's own requests (sent while logged in), one cancelled by the
  // hub with a reason; and a booked institution pickup on the route.
  const demoBuyer = byKey.buyer;
  const latest = requests
    .filter((r) => r.kind === "reservation" || r.kind === "enquiry")
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 4);
  latest.forEach((r, i) => {
    r.buyer_id = demoBuyer.id;
    r.fields = { ...r.fields, name: demoBuyer.name, phone: demoBuyer.phone };
    if (i === 3) {
      r.status = "cancelled";
      r.handled_at = at(new Date(r.created_at.getTime() + 5 * HOUR));
      r.closed_at = r.handled_at;
      r.cancelled_by = "staff";
      r.cancel_reason = "Sold in the hub shop before we could hold it (simulated)";
    }
  });
  const booking = requests.find((r) => r.kind === "institution_pickup" && r.status === "new");
  const nextDay = (from, dows) => {
    const d = new Date(from);
    do d.setUTCDate(d.getUTCDate() + 1);
    while (!dows.includes(d.getUTCDay()));
    return isoDate(d);
  };
  if (booking) {
    booking.status = "scheduled";
    booking.handled_at = booking.created_at;
    booking.scheduled_for = nextDay(end, [2, 5]);
  }
  // Warranty and returns: the demo buyer has a device under warranty with an open
  // claim; a walk-in's claim was repaired; a walk-in's part return is open.
  const recentSales = items
    .filter(
      (i) =>
        i.status === "sold" &&
        (i.grade === "A" || i.grade === "B") &&
        i.category !== "part" &&
        end.getTime() - i.sold_at.getTime() < 20 * DAY,
    )
    .sort((a, b) => b.sold_at - a.sold_at);
  const claims = [];
  const [claimSale, walkInSale] = recentSales;
  if (claimSale) {
    requests.push({
      id: uuid(),
      kind: "reservation",
      fields: {
        name: demoBuyer.name,
        phone: demoBuyer.phone,
        item: claimSale.id,
        fulfilment: "Pick up from the hub (free)",
      },
      status: "sold",
      item_id: claimSale.id,
      created_at: new Date(claimSale.sold_at.getTime() - 6 * HOUR),
      handled_at: claimSale.sold_at,
      closed_at: claimSale.sold_at,
      buyer_id: demoBuyer.id,
    });
    claims.push({
      item_id: claimSale.id,
      buyer_id: demoBuyer.id,
      opened_by: "buyer",
      kind: "warranty",
      contact_name: "",
      contact_phone: "",
      fault: "The battery drops from 100% to 20% in an hour (simulated).",
      status: "open",
      resolution: "",
      staff_note: "",
      created_at: at(new Date(claimSale.sold_at.getTime() + 2 * DAY)),
      closed_at: null,
    });
  }
  if (walkInSale)
    claims.push({
      item_id: walkInSale.id,
      buyer_id: null,
      opened_by: "staff",
      kind: "warranty",
      contact_name: "Walk-in Buyer (simulated)",
      contact_phone: "9000020001",
      fault: "Keyboard keys stopped working (simulated).",
      status: "closed",
      resolution: "Repaired at the hub: keyboard ribbon reseated (simulated).",
      staff_note: "Simulated claim",
      created_at: at(new Date(walkInSale.sold_at.getTime() + 3 * DAY)),
      closed_at: at(new Date(walkInSale.sold_at.getTime() + 5 * DAY)),
    });
  const partSale = items
    .filter(
      (i) =>
        i.status === "sold" &&
        i.category === "part" &&
        i.source_type !== "partner_listing" &&
        end.getTime() - i.sold_at.getTime() < 6 * DAY,
    )
    .sort((a, b) => b.sold_at - a.sold_at)[0];
  if (partSale)
    claims.push({
      item_id: partSale.id,
      buyer_id: null,
      opened_by: "staff",
      kind: "part_return",
      contact_name: "Walk-in Technician (simulated)",
      contact_phone: "9000020002",
      fault: "Does not fit the stated model (simulated).",
      status: "open",
      resolution: "",
      staff_note: "Simulated part return",
      created_at: at(new Date(partSale.sold_at.getTime() + 2 * DAY)),
      closed_at: null,
    });

  const notifications = latest
    .filter((r) => r.status !== "new")
    .map((r) => ({
      user_id: demoBuyer.id,
      kind: `request_${r.status}`,
      title:
        r.status === "cancelled"
          ? `Your reservation for ${r.item_id} was cancelled`
          : r.status === "sold"
            ? `Your reservation for ${r.item_id} is complete`
            : r.status === "done"
              ? `Your question about ${r.item_id} is done`
              : `ReLoop has your ${r.kind === "enquiry" ? "question" : "reservation"} for ${r.item_id}`,
      body:
        r.cancel_reason ??
        (r.status === "contacted" ? "We'll be in touch on WhatsApp or by phone." : ""),
      href: "/account/requests",
      created_at: r.handled_at ?? r.created_at,
      read_at: null,
    }));

  // Shop owner accounts and their offers (the demo shop plus four more).
  const submissions = [];
  let subNo = 0;
  for (const shop of shopAccounts.filter((s) => s.status === "verified")) {
    for (let k = 0; k < 6; k++) {
      const created = new Date(start.getTime() + int(20, 175) * DAY);
      if (!before(created)) continue;
      const category = pick(["phone", "laptop", "monitor", "accessory"]);
      const [brand, model] = pick(MODELS[category]);
      const qty = int(1, 4);
      const roll = rand();
      const status =
        created > new Date(end.getTime() - 4 * DAY)
          ? "Pending"
          : roll < 0.15
            ? "Rejected"
            : roll < 0.3
              ? "Offered"
              : "Purchased";
      const offer = status === "Pending" || status === "Rejected" ? null : int(3, 30) * 50;
      submissions.push({
        id: ++subNo,
        shop_owner_id: shop.id,
        item_name: `${brand} ${model}`,
        brand,
        model,
        description: "Simulated submission.",
        quantity: qty,
        condition: pick(["Good", "Used", "Damaged", "For Parts"]),
        asking_price: int(4, 40) * 50,
        status,
        offer_price: offer,
        offer_note: offer ? "Simulated offer" : "",
        rejection_reason:
          status === "Rejected" ? "Not worth reselling or repairing (simulated)" : null,
        reviewed_at:
          offer || status === "Rejected" ? new Date(created.getTime() + int(4, 30) * HOUR) : null,
        reviewed_by: offer || status === "Rejected" ? byKey.staff.id : null,
        purchase_price: status === "Purchased" ? offer * qty : null,
        purchased_at: status === "Purchased" ? new Date(created.getTime() + int(2, 5) * DAY) : null,
        created_at: created,
      });
    }
  }
  // The demo shop always has an offer to answer and an accepted one waiting for
  // the route; every other bought lot is paid for with a receipt, except the
  // latest, so the hub shows a payment to record.
  const demoShopLots = submissions
    .filter((x) => x.shop_owner_id === byKey.shop.id && x.status !== "Pending")
    .sort((a, b) => b.created_at - a.created_at);
  const pickups = [];
  for (const [i, lot] of demoShopLots.slice(0, 2).entries()) {
    lot.offer_price ??= int(3, 30) * 50;
    lot.offer_note = "Simulated offer";
    lot.rejection_reason = null;
    lot.purchase_price = null;
    lot.purchased_at = null;
    lot.reviewed_at ??= lot.created_at;
    lot.reviewed_by ??= byKey.staff.id;
    lot.status = i === 0 ? "Offered" : "Accepted";
    if (lot.status === "Accepted") {
      lot.owner_response_at = at(new Date(end.getTime() - 20 * HOUR));
      pickups.push({
        source: "shop",
        shop_submission_id: lot.id,
        shop_owner_id: lot.shop_owner_id,
        route_date: nextDay(end, [2]),
        market: "Bahu Plaza",
        status: "scheduled",
      });
    }
  }
  if (booking)
    pickups.push({
      source: "institution",
      request_id: booking.id,
      shop_submission_id: null,
      shop_owner_id: null,
      route_date: booking.scheduled_for,
      market: booking.fields.institution ?? "",
      status: "scheduled",
    });
  const bought = submissions
    .filter((x) => x.status === "Purchased" && x.purchase_price > 0)
    .sort((a, b) => a.purchased_at - b.purchased_at);
  for (const lot of bought.slice(0, -1)) {
    const paid = at(lot.purchased_at);
    const method = chance(0.9) ? "upi" : "cash";
    payoutRows.push({
      at: paid,
      shop_submission_id: lot.id,
      shop_owner_id: lot.shop_owner_id,
      partner_id: null,
      amount_paise: Math.round(lot.purchase_price * 100),
      method,
      paid_at: isoDate(paid),
      reference: method === "upi" ? `SIM-UPI-${int(100000, 999999)}` : "",
      internal_note: "Simulated payment",
      line: "lot",
    });
  }
  // Number every payout in time order: RL-PAY-YYYY-NNNN.
  payoutRows.sort((a, b) => a.at - b.at);
  const receiptNo = {};
  const payouts = payoutRows.map((p) => {
    const year = p.at.getUTCFullYear();
    receiptNo[year] = (receiptNo[year] ?? 0) + 1;
    return {
      shop_submission_id: null,
      weighin_id: null,
      exchange_sale_id: null,
      institution_lot_id: null,
      ...p,
      receipt_no: `RL-PAY-${year}-${String(receiptNo[year]).padStart(4, "0")}`,
      receipt_token: hex(32),
      created_by: byKey.staff.id,
      created_at: p.at,
    };
  });

  // Monthly self-reports of kg sent to outside dealers (the target is zero).
  const dealerReports = [];
  for (let m = SIM_MONTHS - 3; m < SIM_MONTHS; m++) {
    const month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + m + 1, 1));
    if (month > end) continue;
    for (const p of partners
      .filter((x) => x.type === "repair_shop" && x.joined_at < month)
      .slice(0, 14))
      dealerReports.push({
        partner_id: p.id,
        month: isoDate(month),
        kg_to_other_dealers: chance(0.08) ? r1(between(0.5, 3)) : 0,
      });
  }

  // Short-link clicks per day, ramping with the pilot.
  const visits = [];
  for (let d = 0; d < 180; d++) {
    const day = start.getTime() + d * DAY;
    const ramp = 0.3 + (0.7 * d) / 180;
    for (const [slug, [lo, hi]] of Object.entries(LINK_DAILY)) {
      const n = Math.round(int(lo, hi) * ramp + (chance(0.1) ? int(2, 8) : 0));
      for (let k = 0; k < n; k++) {
        const t = new Date(day + int(8, 22) * HOUR + int(0, 59) * 60_000);
        if (before(t))
          visits.push({
            slug,
            source: LINK_SOURCE[slug][0],
            medium: LINK_SOURCE[slug][1],
            visited_at: t,
          });
      }
    }
  }

  // ---------------------------------------------------------------- SQL
  const sql = [];
  sql.push(`-- ReLoop SIMULATION seed, generated ${new Date().toISOString().slice(0, 10)} for ${end.toISOString().slice(0, 10)}.
-- The schema "simulation" exists only in the simulation database: the seed
-- creates it, no migration does, and the API never exposes it. Without it,
-- the seed refuses any database holding real accounts or staff-logged items.
do $$
begin
  if to_regclass('simulation.marker') is null then
    if exists (select 1 from auth.users
                where email not like '%@reloop.demo' and email not like 'e2e-%@example.com') then
      raise exception 'Refusing to seed: this database has real accounts. The simulation seed runs only on the simulation project.';
    end if;
    if exists (select 1 from public.items where created_by is not null) then
      raise exception 'Refusing to seed: this database has items logged by real staff.';
    end if;
  end if;
end $$;
create schema if not exists simulation;
revoke all on schema simulation from public;
create table if not exists simulation.marker (seeded_at timestamptz not null default now(), seeded_for date not null);
delete from simulation.marker;
insert into simulation.marker (seeded_for) values (${q(isoDate(end))});
select set_config('simulation.seeding', 'on', true);`);
  // Reset everything a previous run created, and whatever demo visitors added:
  // every account in the simulation database is a demo or visitor account.
  sql.push(`alter table public.staff disable trigger staff_keep_one_admin;
alter table public.admin_users disable trigger admin_users_keep_one_admin;
delete from public.link_visits;
delete from public.qr_scans;
delete from public.dealer_reports;
delete from public.scrap_ledger;
delete from public.item_events;
delete from public.item_photos;
delete from public.repair_jobs;
delete from public.consignments;
delete from public.submissions;
delete from public.notifications;
delete from public.saved_items;
delete from public.deletion_requests;
delete from public.warranty_claims;
delete from public.reference_prices;
delete from public.payouts;
delete from public.payout_counters;
delete from public.receipt_counters;
delete from public.exchange_sales;
delete from public.part_listings;
delete from public.pickups;
update public.items set parent_id = null, handover_id = null, weighin_id = null, institution_lot_id = null;
delete from public.items;
delete from public.scrap_weighins;
delete from public.institution_lots;
delete from public.ownership_declarations;
delete from public.handovers;
delete from public.shop_submissions;
delete from public.partners;
delete from public.institutions;
delete from public.admin_audit_log;
delete from public.admin_users;
delete from auth.users;
alter table public.staff enable trigger staff_keep_one_admin;
alter table public.admin_users enable trigger admin_users_keep_one_admin;`);

  // Accounts. The sign-up trigger creates each profile and shop record.
  for (const a of [...accounts.filter((x) => x.key !== "shop"), ...shopAccounts]) {
    const meta = {
      full_name: a.name,
      phone: a.phone,
      account_type: a.role === "shop_owner" ? "shop_owner" : "buyer",
      ...(a.role === "shop_owner"
        ? { shop_name: a.shop_name, business_address: `${a.market}, Jammu (simulated)` }
        : {}),
    };
    if (auth === "supabase") {
      sql.push(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', ${q(a.id)}, 'authenticated', 'authenticated', ${q(a.email)}, extensions.crypt(${q(DEMO_PASSWORD)}, extensions.gen_salt('bf')), ${q(start)}, '{"provider":"email","providers":["email"]}'::jsonb, ${q(meta)}, ${q(start)}, ${q(start)}, '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (${q(a.id)}, ${q(a.id)}, ${q(a.id)}, ${q({ sub: a.id, email: a.email, email_verified: true })}, 'email', ${q(start)}, ${q(start)}, ${q(start)});`);
    } else {
      sql.push(
        `insert into auth.users (id, email, raw_user_meta_data) values (${q(a.id)}, ${q(a.email)}, ${q(meta)});`,
      );
    }
  }
  sql.push(`insert into public.staff (user_id, full_name, role) values (${q(byKey.admin.id)}, 'Demo Admin', 'admin'), (${q(byKey.staff.id)}, 'Demo Hub Staff', 'staff');
update public.profiles set role = 'admin' where user_id = ${q(byKey.admin.id)};`);
  for (const s of shopAccounts) {
    const [lat, lng] = MARKET_POSITION[s.market];
    sql.push(
      `update public.shop_owners set verification_status = ${q(s.status)}${s.status === "verified" ? `, verified_at = ${q(new Date(start.getTime() + 10 * DAY))}, reviewed_by = ${q(byKey.admin.id)}, review_notes = 'Phone check done (simulated)', show_on_map = true, map_consent_at = ${q(new Date(start.getTime() + 12 * DAY))}, map_market = ${q(s.market)}, map_lat = ${lat}, map_lng = ${lng}, map_approximate = true` : ""} where id = ${q(s.id)};`,
    );
  }
  // Settings for the simulation: route markets that have started, the cutoffs on
  // the seed's end date, a simulated rack count and the rate card's date.
  const markets = Object.fromEntries([
    ...CLUSTER_MARKETS.map((m) => [m, { day: "tue", starts_on: isoDate(start) }]),
    ...OLD_CITY_MARKETS.map((m) => [
      m,
      { day: "fri", starts_on: isoDate(new Date(start.getTime() + 60 * DAY)) },
    ]),
  ]);
  sql.push(`update public.app_settings set value = ${q(markets)}, updated_at = now() where key = 'route.markets';
update public.app_settings set value = to_jsonb(${q(isoDate(end))}::text), updated_at = now() where key in ('ownership.required_from', 'wipe.strip_required_from');
update public.app_settings set value = '120', updated_at = now() where key = 'capacity.device_rack_slots'; -- simulated value
update public.app_settings set value = to_jsonb(${q(isoDate(end))}::text), updated_at = now() where key = 'rate_card.as_of';`);

  const PARTNER_COLS = [
    "id",
    "type",
    "name",
    "owner",
    "phone",
    "market",
    "route_day",
    "is_repair_partner",
    "status",
    "joined_at",
    "notes",
    "label",
    "shop_owner_id",
  ];
  sql.push(...inserts("public.partners", PARTNER_COLS, partners));
  sql.push(
    ...inserts(
      "public.institutions",
      [
        "id",
        "name",
        "type",
        "contact_name",
        "phone",
        "email",
        "is_anchor",
        "notes",
        "named_publicly",
        "named_consent_at",
      ],
      institutions,
    ),
  );
  sql.push(
    ...inserts(
      "public.handovers",
      [
        "id",
        "date",
        "recycler",
        "on_behalf_of",
        "kg_by_category",
        "battery_kg",
        "item_ids",
        "receipt_no",
        "rate_per_kg_paise",
        "amount_paise",
        "notes",
        "kind",
        "bins",
        "rates_paise",
        "created_at",
      ],
      handovers.map((h) => ({
        ...h,
        item_ids: `{${h.item_ids.join(",")}}`,
        bins: `{${h.bins.join(",")}}`,
      })),
    ),
  );
  sql.push(
    ...inserts(
      "public.ownership_declarations",
      [
        "id",
        "confirmed_at",
        "declaration_version",
        "seller_label",
        "partner_id",
        "tags",
        "staff_id",
        "shop_submission_id",
        "note",
      ],
      declarations.map((d) => ({ ...d, tags: `{${d.tags.join(",")}}` })),
    ),
  );
  sql.push(
    ...inserts(
      "public.institution_lots",
      [
        "id",
        "institution_id",
        "request_id",
        "lot_date",
        "fee_paise",
        "fee_receipt_no",
        "fee_received_at",
        "fee_method",
        "ownership_declaration_id",
        "handover_id",
        "created_at",
      ],
      lotRows,
    ),
  );
  sql.push(
    ...inserts(
      "public.scrap_weighins",
      [
        "id",
        "partner_id",
        "pickup_id",
        "weighed_at",
        "screens_kg",
        "boards_kg",
        "batteries_kg",
        "other_kg",
        "rates_paise",
        "amount_paise",
        "to_test_count",
        "to_test_note",
        "ownership_declaration_id",
        "swap_declaration",
      ],
      weighins,
    ),
  );

  // Items in full, with their own timestamps (the triggers would stamp now()).
  const ITEM_COLS = [
    "id",
    "received_at",
    "source_type",
    "partner_id",
    "institution_id",
    "source_name",
    "category",
    "part_type",
    "brand",
    "model",
    "description",
    "has_battery",
    "weight_kg",
    "grade",
    "graded_at",
    "checklist",
    "faults",
    "wipe_required",
    "wipe_method",
    "wiped_at",
    "rack",
    "buy_mode",
    "buy_paise",
    "purchase_payment_method",
    "purchase_paid_at",
    "expected_resale_paise",
    "list_paise",
    "current_paise",
    "price_cut_at",
    "status",
    "listed_at",
    "sold_at",
    "sold_paise",
    "buyer_area",
    "fulfilment",
    "parent_id",
    "handover_id",
    "updated_at",
    "hidden",
    "returned_at",
    "inspection",
    "inspected_at",
    "new_price_paise",
    "new_price_source",
    "new_price_checked_on",
    "ownership_confirmed_at",
    "ownership_confirmed_by",
    "locked_device",
    "weighin_id",
    "institution_lot_id",
    "listed_by_partner_id",
    "commission_pct",
    "partner_reminded_at",
  ];
  // One listing staff hid (a photo to retake) and one sale that came back.
  const hiddenOne = items.find((i) => i.status === "listed" && i.category !== "part");
  if (hiddenOne) hiddenOne.hidden = true;
  const returnedOne = [...items]
    .filter(
      (i) =>
        i.status === "sold" &&
        i.sold_at &&
        end.getTime() - i.sold_at.getTime() < 20 * DAY &&
        !claims.some((c) => c.item_id === i.id) &&
        i.source_type !== "partner_listing",
    )
    .sort((a, b) => b.sold_at - a.sold_at)[0];
  if (returnedOne) {
    const soldOn = isoDate(returnedOne.sold_at);
    const soldFor = returnedOne.sold_paise ? ` for ₹${returnedOne.sold_paise / 100}` : "";
    returnedOne.status = "returned";
    returnedOne.returned_at = at(new Date(returnedOne.sold_at.getTime() + 3 * DAY));
    returnedOne.sold_at = null;
    returnedOne.sold_paise = null;
    returnedOne.buyer_area = null;
    returnedOne.fulfilment = null;
    const wasShopSale = exchangeSales.findIndex((s) => s.item_id === returnedOne.id);
    if (wasShopSale >= 0) exchangeSales.splice(wasShopSale, 1);
    events.push({
      item_id: returnedOne.id,
      at: returnedOne.returned_at,
      type: "returned",
      note: `Battery doesn't hold charge (simulated warranty claim) (sold ${soldOn}${soldFor})`,
    });
  }
  // The demo buyer's saved items (no random draws, so the rest of the seed stays
  // the same): one whose price cut came after they saved it, two on sale, one sold.
  const ownItems = new Set(
    requests.filter((r) => r.buyer_id === demoBuyer.id && r.item_id).map((r) => r.item_id),
  );
  const free = (i) =>
    i.category === "part" &&
    !i.hidden &&
    !ownItems.has(i.id) &&
    i.source_type !== "partner_listing";
  const listedOk = items.filter((i) => i.status === "listed" && free(i));
  const cutOne = listedOk
    .filter((i) => i.price_cut_at)
    .sort((x, y) => y.price_cut_at - x.price_cut_at)[0];
  const lastSold = items
    .filter((i) => i.status === "sold" && free(i))
    .sort((x, y) => y.sold_at - x.sold_at)[0];
  const titleOf = (i) => [i.brand, i.model].filter(Boolean).join(" ") || i.id;
  const rupees = (paise) => (paise / 100).toLocaleString("en-IN");
  const savedBefore = (i, t) =>
    at(new Date(Math.max(new Date(i.listed_at).getTime() + HOUR, t.getTime() - 2 * DAY)));
  const saved = [
    ...(cutOne
      ? [{ i: cutOne, paise: cutOne.list_paise, at: savedBefore(cutOne, cutOne.price_cut_at) }]
      : []),
    ...listedOk
      .filter((i) => !i.price_cut_at)
      .slice(-2)
      .map((i) => ({ i, paise: i.current_paise, at: savedBefore(i, end) })),
    ...(lastSold
      ? [
          {
            i: lastSold,
            paise: lastSold.current_paise,
            at: savedBefore(lastSold, lastSold.sold_at),
          },
        ]
      : []),
  ].map(({ i, paise, at: when }) => ({
    user_id: demoBuyer.id,
    item_id: i.id,
    price_when_saved_paise: paise,
    saved_at: when,
  }));
  if (cutOne)
    notifications.push({
      user_id: demoBuyer.id,
      kind: "saved_price_drop",
      title: `Price dropped: ${titleOf(cutOne)}`,
      body: `₹${rupees(cutOne.list_paise)} → ₹${rupees(cutOne.current_paise)}`,
      href: `/shop/${cutOne.id}`,
      created_at: cutOne.price_cut_at,
      read_at: null,
    });
  if (lastSold)
    notifications.push({
      user_id: demoBuyer.id,
      kind: "saved_sold",
      title: `Sold: ${titleOf(lastSold)}`,
      body: "It found a new owner. Similar items are in the shop.",
      href: `/shop?category=${lastSold.category}`,
      created_at: lastSold.sold_at,
      read_at: null,
    });
  // The demo shop owner's notices: its latest payouts and listings.
  const demoPartner = partners[0];
  for (const p of payouts.filter((x) => x.partner_id === demoPartner.id).slice(-3))
    notifications.push({
      user_id: byKey.shop.id,
      kind: "payout_made",
      title: `ReLoop paid you ₹${rupees(p.amount_paise)}`,
      body: `Receipt ${p.receipt_no}.`,
      href: "/account",
      created_at: p.at,
      read_at: null,
    });
  // Every graded item has its inspection (version 1), from its checklist.
  const ON_SALE_OR_SOLD = ["listed", "reserved", "sold", "returned"];
  const inspectionOf = (i) => {
    if (!i.grade) return null;
    const afterRepair = i.grade === "B" && ON_SALE_OR_SOLD.includes(i.status);
    const checks = Object.fromEntries(
      Object.entries(i.checklist ?? {}).map(([k, ok]) => [k, ok || afterRepair ? "pass" : "fail"]),
    );
    const battery = i.has_battery && i.category !== "part";
    return {
      version: 1,
      checks,
      ...(battery && {
        battery_health_pct:
          i.grade === "A" ? int(82, 96) : i.grade === "B" ? int(72, 90) : int(40, 70),
      }),
      ...(i.part_type === "storage" && { storage_health_pct: int(80, 98) }),
    };
  };
  const ordered = [...items]
    .map((i) => ({
      hidden: false,
      returned_at: null,
      new_price_paise: null,
      new_price_source: "",
      new_price_checked_on: null,
      ...i,
      inspection: inspectionOf(i),
      inspected_at: i.grade ? (i.graded_at ?? i.received_at) : null,
    }))
    .sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0));
  sql.push(`alter table public.items disable trigger user;
alter table public.submissions disable trigger user;`);
  sql.push(
    ...inserts(
      "public.items",
      ITEM_COLS,
      ordered.map((i) => ({
        ...i,
        updated_at: at(i.sold_at ?? i.listed_at ?? i.graded_at ?? i.received_at),
      })),
    ),
  );
  sql.push(
    ...inserts(
      "public.item_events",
      ["item_id", "at", "type", "note"],
      events.sort((a, b) => a.at - b.at),
    ),
  );
  sql.push(
    ...inserts(
      "public.repair_jobs",
      ["id", "item_id", "partner_id", "fault", "fee_paise", "sent_at", "returned_at", "outcome"],
      repairs,
    ),
  );
  sql.push(
    ...inserts(
      "public.submissions",
      [
        "id",
        "kind",
        "fields",
        "status",
        "item_id",
        "created_at",
        "handled_at",
        "closed_at",
        "buyer_id",
        "scheduled_for",
        "cancelled_by",
        "cancel_reason",
      ],
      requests.map((r) => ({
        buyer_id: null,
        scheduled_for: null,
        cancelled_by: r.status === "cancelled" ? "staff" : null,
        cancel_reason: null,
        ...r,
      })),
    ),
  );
  sql.push(`alter table public.items enable trigger user;
alter table public.submissions enable trigger user;`);
  sql.push(
    ...inserts(
      "public.scrap_ledger",
      ["at", "bin", "kg", "source", "weighin_id", "item_id", "estimated", "note", "handover_id"],
      ledger.filter((l) => before(l.at)),
    ),
  );
  sql.push(
    ...inserts(
      "public.part_listings",
      [
        "id",
        "partner_id",
        "shop_owner_id",
        "part_type",
        "brand",
        "model",
        "description",
        "asking_paise",
        "agree_named",
        "photos",
        "status",
        "reject_reason",
        "item_id",
        "created_at",
        "reviewed_at",
      ],
      listings.map((l) => ({ ...l, photos: "{}" })),
    ),
  );
  sql.push(
    ...inserts(
      "public.exchange_sales",
      [
        "id",
        "item_id",
        "partner_id",
        "sold_paise",
        "commission_pct",
        "commission_paise",
        "shop_share_paise",
        "sold_at",
        "payout_due_on",
        "status",
      ],
      exchangeSales,
    ),
  );
  sql.push(
    ...inserts(
      "public.shop_submissions",
      [
        "id",
        "shop_owner_id",
        "item_name",
        "brand",
        "model",
        "description",
        "quantity",
        "condition",
        "asking_price",
        "status",
        "offer_price",
        "offer_note",
        "rejection_reason",
        "reviewed_at",
        "reviewed_by",
        "purchase_price",
        "purchased_at",
        "created_at",
        "owner_response_at",
      ],
      submissions.map((x) => ({ owner_response_at: null, ...x })),
    ),
  );
  sql.push(
    ...inserts(
      "public.pickups",
      [
        "source",
        "shop_submission_id",
        "request_id",
        "shop_owner_id",
        "route_date",
        "market",
        "status",
      ],
      pickups.map((p) => ({ request_id: null, ...p })),
    ),
  );
  sql.push(
    ...inserts(
      "public.payouts",
      [
        "receipt_no",
        "shop_submission_id",
        "weighin_id",
        "exchange_sale_id",
        "institution_lot_id",
        "shop_owner_id",
        "partner_id",
        "amount_paise",
        "method",
        "paid_at",
        "reference",
        "internal_note",
        "line",
        "receipt_token",
        "created_by",
        "created_at",
      ],
      payouts,
    ),
  );
  sql.push(
    ...inserts(
      "public.payout_counters",
      ["year", "last_number"],
      Object.entries(receiptNo).map(([year, last_number]) => ({ year: Number(year), last_number })),
    ),
  );
  sql.push(
    ...inserts(
      "public.receipt_counters",
      ["prefix", "year", "last_number"],
      Object.entries(feeCount).map(([year, last_number]) => ({
        prefix: "FEE",
        year: Number(year),
        last_number,
      })),
    ),
  );
  sql.push(
    `select setval(pg_get_serial_sequence('public.shop_submissions', 'id'), greatest((select max(id) from public.shop_submissions), 1));`,
  );
  sql.push(
    ...inserts("public.link_visits", ["slug", "source", "medium", "visited_at"], visits, 1000),
  );
  sql.push(
    ...inserts(
      "public.reference_prices",
      ["category", "part_type", "low_paise", "typical_paise", "high_paise", "source", "checked_on"],
      references,
    ),
  );
  sql.push(
    ...inserts(
      "public.warranty_claims",
      [
        "item_id",
        "buyer_id",
        "opened_by",
        "kind",
        "contact_name",
        "contact_phone",
        "fault",
        "status",
        "resolution",
        "staff_note",
        "created_at",
        "closed_at",
      ],
      claims,
    ),
  );
  sql.push(
    ...inserts(
      "public.dealer_reports",
      ["partner_id", "month", "kg_to_other_dealers"],
      dealerReports,
    ),
  );
  sql.push(
    ...inserts(
      "public.notifications",
      ["user_id", "kind", "title", "body", "href", "created_at", "read_at"],
      notifications,
    ),
  );
  sql.push(
    ...inserts(
      "public.saved_items",
      ["user_id", "item_id", "price_when_saved_paise", "saved_at"],
      saved,
    ),
  );
  sql.push(`update public.item_counters set last_number = ${counter} where hub_code = 'JMU';`);
  // Simulation-only guards (created here, never by a migration): visitors share
  // the demo logins, so nobody can change their passwords, emails, roles,
  // names, phones or shop details, or delete them.
  // The seed itself runs with simulation.seeding = on.
  sql.push(`create or replace function simulation.keep_demo_accounts()
returns trigger
language plpgsql
set search_path = ''
as $f$
declare
  who uuid := coalesce(to_jsonb(old) ->> 'user_id', to_jsonb(old) ->> 'id')::uuid;
begin
  if coalesce(current_setting('simulation.seeding', true), '') = 'on' then
    return coalesce(new, old);
  end if;
  if exists (select 1 from auth.users u where u.id = who and u.email like '%@reloop.demo') then
    if tg_table_name <> 'users' or to_jsonb(new) ->> 'email' is distinct from to_jsonb(old) ->> 'email'
       or to_jsonb(new) ->> 'encrypted_password' is distinct from to_jsonb(old) ->> 'encrypted_password' then
      raise exception 'Demo accounts stay as they are, so every visitor can use them';
    end if;
  end if;
  return coalesce(new, old);
end;
$f$;
drop trigger if exists keep_demo_accounts on public.staff;
create trigger keep_demo_accounts before update or delete on public.staff
  for each row execute function simulation.keep_demo_accounts();
drop trigger if exists keep_demo_accounts on public.admin_users;
create trigger keep_demo_accounts before update or delete on public.admin_users
  for each row execute function simulation.keep_demo_accounts();
drop trigger if exists keep_demo_accounts on public.profiles;
create trigger keep_demo_accounts before update of role, must_change_password, full_name, phone on public.profiles
  for each row execute function simulation.keep_demo_accounts();
drop trigger if exists keep_demo_accounts on public.shop_owners;
create trigger keep_demo_accounts before update of shop_name, owner_name, phone, gstin, business_address, verification_status or delete on public.shop_owners
  for each row execute function simulation.keep_demo_accounts();
drop trigger if exists keep_demo_accounts on auth.users;
create trigger keep_demo_accounts before update or delete on auth.users
  for each row execute function simulation.keep_demo_accounts();
select set_config('simulation.seeding', 'off', true);`);

  const summary = {
    end: isoDate(end),
    items: items.length,
    devices: items.filter((i) => i.category !== "part").length,
    parts: items.filter((i) => i.category === "part").length,
    sold: items.filter((i) => i.status === "sold").length,
    listed: items.filter((i) => i.status === "listed").length,
    weighins: weighins.length,
    kg: r1(
      weighins.reduce((a, w) => a + w.screens_kg + w.boards_kg + w.batteries_kg + w.other_kg, 0),
    ),
    handovers: handovers.length,
    lots: lotRows.length,
    listings: listings.length,
    requests: requests.length,
    submissions: submissions.length,
    visits: visits.length,
    partners: partners.length,
  };
  return { sql: sql.join("\n\n"), summary };
}

// ---------------------------------------------------------------- CLI
const isMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain) {
  const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}`))?.split("=")[1];
  const today = arg("today") ? new Date(`${arg("today")}T12:00:00Z`) : new Date();
  const { sql, summary } = buildSeed({ today });
  console.error(JSON.stringify(summary));
  if (process.argv.some((a) => a.startsWith("--sql")))
    writeFileSync(arg("sql") ?? "sim-seed.sql", sql);
  if (process.argv.includes("--apply")) {
    const ref = process.env.SIM_PROJECT_REF ?? SIM_PROJECT_REF;
    if (ref !== SIM_PROJECT_REF || ref === LIVE_PROJECT_REF)
      throw new Error("Refusing: not the simulation project.");
    const token = process.env.SUPABASE_ACCESS_TOKEN;
    if (!token) throw new Error("Set SUPABASE_ACCESS_TOKEN (Supabase personal access token).");
    // One request, so the whole seed is one transaction.
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `begin;\n${sql}\ncommit;` }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Seed failed (${res.status}): ${text.slice(0, 500)}`);
    console.error("Seeded the simulation project.");
  }
}

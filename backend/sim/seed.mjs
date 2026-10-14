// Seeds the SIMULATION database with about six months of operations built
// from the business plan's assumptions (docs/ReLoop_Business_Plan.html):
// the 60 → 280 items a month ramp, the source mix, the A/B/C/D split, buy and
// sale prices from the grade rules, repairs, stripped parts, scrap handovers,
// requests, shop submissions and short-link clicks. Every name is fictional.
//
//   node backend/sim/seed.mjs --sql=out.sql     write the SQL only
//   node backend/sim/seed.mjs --apply           run it on the simulation project
//                                                (needs SUPABASE_ACCESS_TOKEN)
//   --today=YYYY-MM-DD                          end date (default: today)
//
// Deterministic: the same --today gives the same data. Re-runnable: it first
// removes everything a previous run created. It refuses any project but the
// simulation one, and the SQL itself refuses a database holding real accounts.
import { realpathSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  GRADE_MIX,
  ITEMS_PER_MONTH,
  LIVE_PROJECT_REF,
  SIM_PROJECT_REF,
  SOURCE_MIX,
} from "./config.mjs";

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
const uuid = () => {
  const h = Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16)).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const roundTo = (paise, step) => Math.max(step, Math.round(paise / step) * step);

// ---------------------------------------------------------------- the catalogue
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const CATEGORY_MIX = {
  repair_shop: {
    phone: 45,
    laptop: 14,
    accessory: 12,
    small_appliance: 7,
    tv: 6,
    monitor: 5,
    desktop: 4,
    ups: 4,
    printer: 3,
  },
  retailer: { phone: 35, laptop: 15, tv: 12, small_appliance: 15, accessory: 15, monitor: 8 },
  institution: { desktop: 35, monitor: 30, printer: 15, ups: 14, laptop: 6 },
  household: { phone: 40, laptop: 20, small_appliance: 25, accessory: 15 },
};
/** Typical resale price for a working (grade A) unit, in rupees. */
const RESALE_A = {
  phone: 5000,
  laptop: 14000,
  desktop: 7000,
  monitor: 3200,
  tv: 6000,
  printer: 2800,
  ups: 1800,
  small_appliance: 900,
  accessory: 450,
};
/** Estimated weight per unit in kg (simulation working values). */
const WEIGHT = {
  phone: 0.2,
  laptop: 2.2,
  desktop: 8,
  monitor: 4.5,
  tv: 8,
  printer: 6,
  ups: 7,
  small_appliance: 2,
  accessory: 0.3,
  part: 0.2,
};
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
  tv: [
    ["Samsung", "32-inch LED"],
    ["LG", "32-inch Smart"],
    ["Mi", "32-inch 4A"],
    ["Sony", "32-inch Bravia"],
  ],
  printer: [
    ["Canon", "LBP2900"],
    ["HP", "LaserJet P1108"],
    ["Epson", "L3110"],
    ["Brother", "HL-L2321D"],
  ],
  ups: [
    ["APC", "BX600C"],
    ["Microtek", "600VA"],
    ["Luminous", "Pro 600"],
  ],
  small_appliance: [
    ["Bajaj", "Mixer grinder"],
    ["Philips", "Dry iron"],
    ["Usha", "Table fan"],
    ["Prestige", "Induction cooktop"],
  ],
  accessory: [
    ["Logitech", "K120 keyboard"],
    ["HP", "USB mouse"],
    ["Zebronics", "Speaker set"],
    ["Boat", "Wired earphones"],
  ],
};
const PARTS_FROM = {
  phone: ["screen", "battery", "board"],
  laptop: ["ram", "storage", "screen", "charger", "battery"],
  desktop: ["ram", "storage", "board"],
  monitor: ["board", "screen"],
  tv: ["board"],
  printer: ["motor", "board"],
  ups: ["board", "battery"],
  small_appliance: ["motor"],
  accessory: ["other"],
};
const PART_PRICE = {
  screen: 900,
  battery: 450,
  board: 1200,
  ram: 700,
  storage: 900,
  charger: 300,
  motor: 350,
  other: 200,
};
const CHECKS = {
  phone: ["Powers on", "Display", "Touch", "Cameras", "Battery health", "Charging", "Buttons"],
  laptop: ["Powers on", "Display", "Keyboard", "Trackpad", "Battery health", "Ports", "Wi-Fi"],
  desktop: ["Powers on", "Boots", "Ports", "Storage"],
  monitor: ["Powers on", "Display", "No dead pixels", "Inputs"],
  tv: ["Powers on", "Display", "Sound", "Inputs", "Remote"],
  printer: ["Powers on", "Test print", "Paper feed"],
  ups: ["Powers on", "Battery holds charge", "Output"],
  small_appliance: ["Powers on", "Works as intended", "Wiring safe"],
  accessory: ["Works", "Cable / connector"],
  part: ["Tested working"],
};
const MARKETS = ["Raghunath Bazaar", "Residency Road", "Gandhi Nagar"];
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

// ---------------------------------------------------------------- the generator
/**
 * Builds the seed. `auth: "supabase"` writes full Supabase auth rows (with
 * hashed passwords and identities); `auth: "plain"` writes the minimal rows
 * the PGlite test shim has.
 */
export function buildSeed({ today = new Date(), auth = "supabase" } = {}) {
  rand = mulberry32(20261014);
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 9),
  );
  const start = new Date(end.getTime() - 180 * DAY);
  const before = (t) => t.getTime() <= end.getTime();
  const at = (t) => new Date(Math.min(t.getTime(), end.getTime()));

  // Accounts: demo logins plus the other partner shops' owners.
  const accounts = DEMO_ACCOUNTS.map((a) => ({
    ...a,
    id: uuid(),
    phone: "9000000" + String(int(100, 999)),
  }));
  const byKey = Object.fromEntries(accounts.map((a) => [a.key, a]));

  // Partners: 25 shops, joining 10 → 18 → 25 over the first months.
  const partners = Array.from({ length: 25 }, (_, i) => {
    const joined = new Date(
      start.getTime() + (i < 10 ? int(0, 25) : i < 18 ? int(30, 58) : int(60, 110)) * DAY,
    );
    return {
      id: uuid(),
      type: i % 7 === 3 || i % 7 === 6 ? "retailer" : "repair_shop",
      name: `Simulated Shop ${String(i + 1).padStart(2, "0")}`,
      owner: `Owner ${String(i + 1).padStart(2, "0")} (simulated)`,
      phone: "90000" + String(10000 + i),
      market: MARKETS[i % 3],
      route_day: i % 2 ? "fri" : "tue",
      is_repair_partner: i % 4 === 0,
      status: i === 23 ? "paused" : i === 24 ? "lead" : "active",
      joined_at: joined,
      notes: "Simulated partner.",
    };
  });
  const repairPartners = partners.filter((p) => p.is_repair_partner);
  const institutions = [
    {
      id: uuid(),
      name: "Simulated College A",
      type: "college",
      contact_name: "Lab in-charge (simulated)",
      phone: "9000020001",
      email: "",
      is_anchor: true,
      notes: "Simulated anchor institution.",
    },
    {
      id: uuid(),
      name: "Simulated School B",
      type: "school",
      contact_name: "Admin office (simulated)",
      phone: "9000020002",
      email: "",
      is_anchor: true,
      notes: "Simulated anchor institution.",
    },
    {
      id: uuid(),
      name: "Simulated Office C",
      type: "office",
      contact_name: "IT desk (simulated)",
      phone: "9000020003",
      email: "",
      is_anchor: true,
      notes: "Simulated anchor institution.",
    },
  ];

  const items = [];
  const events = [];
  const repairs = [];
  let counter = 0;
  const nextId = () => `RL-JMU-${String(++counter).padStart(4, "0")}`;
  const event = (item_id, t, type, note = "") => {
    if (before(t)) events.push({ item_id, at: t, type, note: note ?? "" });
  };

  function sell(item, listedAt, meanDays, pSell) {
    item.status = "listed";
    item.listed_at = listedAt;
    event(item.id, listedAt, "status:listed", `Listed at ₹${item.list_paise / 100}`);
    if (!before(listedAt)) {
      // Listed in the future relative to the end date: still being processed.
      item.status = "graded";
      item.listed_at = null;
      return;
    }
    const sells = chance(pSell);
    const days = -Math.log(1 - rand()) * meanDays;
    const soldAt = new Date(listedAt.getTime() + days * DAY + int(1, 8) * HOUR);
    const cutAt = new Date(listedAt.getTime() + 45 * DAY);
    if (before(cutAt) && (!sells || soldAt > cutAt)) {
      item.current_paise = roundTo(item.list_paise * 0.8, 1000);
      item.price_cut_at = cutAt;
      event(
        item.id,
        cutAt,
        "price_changed",
        `₹${item.list_paise / 100} → ₹${item.current_paise / 100}`,
      );
    }
    const downgradeAt = new Date(listedAt.getTime() + 75 * DAY);
    if (item.category !== "part" && before(downgradeAt) && (!sells || soldAt > downgradeAt)) {
      // The hub's day-75 rule (apply_stock_rules): unsold devices go to C for parts.
      item.grade = "C";
      item.status = "stripping";
      event(item.id, downgradeAt, "status:stripping", "Unsold after 75 days: downgraded to C");
      return;
    }
    if (sells && before(soldAt)) {
      item.status = "sold";
      item.sold_at = soldAt;
      item.sold_paise = item.current_paise;
      const shipsIndia = item.category === "laptop" || item.part_type === "board";
      item.fulfilment =
        shipsIndia && chance(0.1) ? "ship_india" : chance(0.38) ? "delivery_jammu" : "pickup";
      event(item.id, soldAt, "status:sold", `Sold for ₹${item.sold_paise / 100}`);
    } else if (chance(0.05)) {
      item.status = "reserved";
    }
  }

  function toScrap(item, t) {
    item.status = "in_scrap_cage";
    item.cage_at = t;
    event(item.id, t, "status:in_scrap_cage", `Into scrap cage (${item.weight_kg} kg)`);
  }

  ITEMS_PER_MONTH.forEach((count, m) => {
    const monthStart = start.getTime() + m * 30 * DAY;
    for (let n = 0; n < count; n++) {
      const source = weighted(SOURCE_MIX);
      const category = weighted(CATEGORY_MIX[source]);
      const [brand, model] = pick(MODELS[category]);
      const received = new Date(monthStart + rand() * 30 * DAY);
      if (!before(received)) continue;
      const grade = weighted(GRADE_MIX);
      const resaleA = roundTo(RESALE_A[category] * between(0.65, 1.35) * 100, 5000);
      const resale = grade === "B" ? roundTo(resaleA * 0.75, 5000) : resaleA;
      const buy =
        grade === "A"
          ? roundTo(resale * 0.45, 5000)
          : grade === "B"
            ? roundTo(resale * 0.25, 5000)
            : grade === "C"
              ? int(10, 20) * 1000
              : 0;
      const activeShops = partners.filter((p) => p.joined_at <= received && p.status !== "lead");
      const partner =
        source === "repair_shop" || source === "retailer"
          ? pick(
              activeShops.filter((p) => p.type === source).length
                ? activeShops.filter((p) => p.type === source)
                : activeShops,
            )
          : null;
      const institution = source === "institution" ? pick(institutions) : null;
      const wipe = ["phone", "laptop", "desktop"].includes(category);
      const graded = new Date(received.getTime() + int(2, 20) * HOUR);
      const checks = Object.fromEntries(
        CHECKS[category].map((c) => [c, grade === "A" ? true : !(grade !== "A" && chance(0.35))]),
      );
      const item = {
        id: nextId(),
        received_at: received,
        source_type: source,
        partner_id: partner?.id ?? null,
        institution_id: institution?.id ?? null,
        source_name: partner?.name ?? institution?.name ?? "",
        category,
        part_type: null,
        brand,
        model,
        description: `${brand} ${model}. Simulated item.`,
        has_battery: ["phone", "laptop", "ups"].includes(category),
        weight_kg: Math.round(WEIGHT[category] * between(0.8, 1.2) * 100) / 100,
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
        wipe_method: null,
        wiped_at: null,
        rack: "",
        buy_mode: grade === "D" ? "free" : "cash",
        buy_paise: buy,
        purchase_payment_method: buy > 0 ? (chance(0.6) ? "cash" : "upi") : "not_paid",
        purchase_paid_at: buy > 0 ? received : null,
        expected_resale_paise: grade === "D" ? null : resale,
        list_paise: null,
        current_paise: null,
        price_cut_at: null,
        status: before(graded) ? "graded" : "received",
        listed_at: null,
        sold_at: null,
        sold_paise: null,
        fulfilment: null,
        parent_id: null,
        handover_id: null,
      };
      items.push(item);
      event(item.id, received, "received", null);
      if (!before(graded)) continue;
      event(item.id, graded, "graded", `Grade ${grade}`);

      let ready = graded;
      if (wipe && grade !== "D") {
        const wiped = new Date(graded.getTime() + int(1, 18) * HOUR);
        if (before(wiped)) {
          item.wiped_at = wiped;
          item.wipe_method =
            category === "phone" ? "reset_overwrite" : chance(0.04) ? "drilled" : "drive_wipe";
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
        const job = {
          id: uuid(),
          item_id: item.id,
          partner_id: partnerR.id,
          fault: item.faults,
          fee_paise: int(35, 75) * 1000,
          sent_at: sent,
          returned_at: before(back) ? back : null,
          outcome: before(back) ? (fixed ? "fixed" : "not_fixable") : null,
        };
        repairs.push(job);
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
          event(
            item.id,
            back,
            "status:stripping",
            "Back from repair: not fixable, downgraded to C",
          );
          strip(item, back);
        }
      } else if (grade === "C") {
        strip(item, ready);
      } else {
        toScrap(item, new Date(graded.getTime() + int(1, 20) * HOUR));
      }
    }
  });

  function strip(item, from) {
    const t = new Date(from.getTime() + int(6, 48) * HOUR);
    if (!before(t)) {
      item.status = "stripping";
      return;
    }
    const kinds = PARTS_FROM[item.category];
    const n = Math.min(kinds.length, int(1, 3));
    for (const partType of [...kinds].sort(() => rand() - 0.5).slice(0, n)) {
      const price = roundTo(PART_PRICE[partType] * between(0.7, 1.3) * 100, 5000);
      const part = {
        ...item,
        id: nextId(),
        received_at: t,
        source_type: "stripped",
        partner_id: null,
        institution_id: null,
        source_name: "",
        category: "part",
        part_type: partType,
        description: `${partType === "storage" ? "Storage drive" : partType[0].toUpperCase() + partType.slice(1)} removed from ${item.brand} ${item.model} (${item.id}). Simulated item.`,
        has_battery: partType === "battery",
        weight_kg: 0.2,
        grade: "C",
        graded_at: t,
        checklist: { "Tested working": true },
        faults: "",
        wipe_required: partType === "storage",
        wipe_method: partType === "storage" ? "drive_wipe" : null,
        wiped_at: partType === "storage" ? t : null,
        buy_mode: "free",
        buy_paise: 0,
        purchase_payment_method: "not_paid",
        purchase_paid_at: null,
        expected_resale_paise: price,
        list_paise: price,
        current_paise: price,
        status: "graded",
        parent_id: item.id,
      };
      items.push(part);
      event(part.id, t, "received", `Part from ${item.id}`);
      event(part.id, t, "graded", "Grade C");
      sell(part, new Date(t.getTime() + int(6, 40) * HOUR), 20, 0.7);
    }
    event(item.id, t, "note", `${n} part(s) removed; shell to scrap cage`);
    item.weight_kg = Math.round(item.weight_kg * 0.7 * 100) / 100;
    toScrap(item, t);
  }

  // Recycler handovers: when the cage reaches 100 kg or 14 days pass.
  const handovers = [];
  const cage = items
    .filter((i) => i.status === "in_scrap_cage")
    .sort((a, b) => a.cage_at - b.cage_at);
  let pending = [];
  let last = start;
  let hNo = 0;
  const flush = (t) => {
    if (!pending.length) return;
    const kg = {};
    for (const it of pending)
      kg[it.category] = Math.round(((kg[it.category] ?? 0) + Number(it.weight_kg)) * 100) / 100;
    const total = Object.values(kg).reduce((a, b) => a + b, 0);
    const battery = Math.round(between(1, 4) * 100) / 100;
    const h = {
      id: uuid(),
      date: t.toISOString().slice(0, 10),
      recycler: "VRG Groups, Gangyal",
      on_behalf_of: null,
      kg_by_category: kg,
      battery_kg: battery,
      item_ids: pending.map((i) => i.id),
      receipt_no: `SIM-VRG-${String(++hNo).padStart(4, "0")}`,
      rate_per_kg_paise: 2000,
      amount_paise: Math.round((total + battery) * 2000),
      notes: "Simulated handover.",
      created_at: t,
    };
    handovers.push(h);
    for (const it of pending) {
      it.status = "handed_over";
      it.handover_id = h.id;
      event(it.id, t, "status:handed_over", `Handed to the recycler (receipt ${h.receipt_no})`);
    }
    pending = [];
    last = t;
  };
  for (let d = start.getTime(); d <= end.getTime(); d += DAY) {
    const day = new Date(d);
    for (const it of cage)
      if (it.cage_at <= day && !pending.includes(it) && it.status === "in_scrap_cage")
        pending.push(it);
    const kg = pending.reduce((a, b) => a + Number(b.weight_kg), 0);
    if (pending.length && (kg >= 100 || day - last >= 14 * DAY)) flush(new Date(d + 6 * HOUR));
  }

  // Public requests: reservations for many sales, questions, institution pickups.
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
    // Reservations always come after the item was listed.
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
  for (let m = 0; m < 6; m++)
    for (const inst of institutions) {
      const t = new Date(start.getTime() + (m * 30 + int(2, 25)) * DAY);
      req(
        "institution_pickup",
        {
          institution: inst.name,
          contact: inst.contact_name,
          phone: inst.phone,
          items: "Old desktops, monitors and printers",
        },
        m === 5 && chance(0.5) ? "new" : "done",
        t,
      );
    }

  // The demo buyer's own requests (sent while logged in): the latest few
  // reservations and questions, one of them cancelled by the hub with a
  // reason. And a booked institution pickup, to show the booking stages.
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
  if (booking) {
    booking.status = "scheduled";
    booking.handled_at = booking.created_at;
    // The next Tuesday or Friday after today.
    const next = new Date(end);
    do next.setUTCDate(next.getUTCDate() + 1);
    while (![2, 5].includes(next.getUTCDay()));
    booking.scheduled_for = next.toISOString().slice(0, 10);
  }
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

  // Shop owner accounts and their submissions (the demo shop plus four more).
  const shopAccounts = [
    {
      ...byKey.shop,
      shop_name: "Demo Repairs (simulated)",
      market: "Raghunath Bazaar",
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
      market: MARKETS[(i + 1) % 3],
      status: i === 3 ? "pending" : "verified",
    })),
  ];
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

  // The demo shop always has an offer to answer and an accepted one waiting
  // for the route; every other bought lot is paid for with a receipt, except
  // the latest, so the hub shows a payment to record.
  const demoShopLots = submissions
    .filter((x) => x.shop_owner_id === byKey.shop.id && x.status !== "Pending")
    .sort((a, b) => b.created_at - a.created_at);
  const nextRouteDay = (from) => {
    const d = new Date(from);
    do d.setUTCDate(d.getUTCDate() + 1);
    while (![2, 5].includes(d.getUTCDay()));
    return d.toISOString().slice(0, 10);
  };
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
        route_date: nextRouteDay(end),
        market: "Raghunath Bazaar",
        status: "scheduled",
      });
    }
  }
  // The booked institution pickup is on the route too (the seed writes with
  // triggers off, so it adds the pickup itself).
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
  const payouts = [];
  const receiptNo = {};
  for (const lot of bought.slice(0, -1)) {
    const paid = at(lot.purchased_at);
    const year = paid.getUTCFullYear();
    receiptNo[year] = (receiptNo[year] ?? 0) + 1;
    const method = chance(0.6) ? "upi" : "cash";
    payouts.push({
      receipt_no: `RL-PAY-${year}-${String(receiptNo[year]).padStart(4, "0")}`,
      shop_submission_id: lot.id,
      shop_owner_id: lot.shop_owner_id,
      amount_paise: Math.round(lot.purchase_price * 100),
      method,
      paid_at: paid.toISOString().slice(0, 10),
      reference: method === "upi" ? `SIM-UPI-${int(100000, 999999)}` : "",
      internal_note: "Simulated payment",
      created_by: byKey.staff.id,
      created_at: paid,
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
insert into simulation.marker (seeded_for) values (${q(end.toISOString().slice(0, 10))});
select set_config('simulation.seeding', 'on', true);`);
  // Reset everything a previous run created, and whatever demo visitors added:
  // every account in the simulation database is a demo or visitor account.
  sql.push(`alter table public.staff disable trigger staff_keep_one_admin;
alter table public.admin_users disable trigger admin_users_keep_one_admin;
delete from public.link_visits;
delete from public.qr_scans;
delete from public.item_events;
delete from public.item_photos;
delete from public.repair_jobs;
delete from public.consignments;
delete from public.submissions;
delete from public.notifications;
delete from public.deletion_requests;
delete from public.payouts;
delete from public.payout_counters;
delete from public.pickups;
update public.items set parent_id = null, handover_id = null;
delete from public.items;
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
    const i = MARKETS.indexOf(s.market);
    const lat = [32.7302, 32.7268, 32.7037][i];
    const lng = [74.8641, 74.8596, 74.8617][i];
    sql.push(
      `update public.shop_owners set verification_status = ${q(s.status)}${s.status === "verified" ? `, verified_at = ${q(new Date(start.getTime() + 10 * DAY))}, reviewed_by = ${q(byKey.admin.id)}, review_notes = 'Phone check done (simulated)', show_on_map = true, map_consent_at = ${q(new Date(start.getTime() + 12 * DAY))}, map_market = ${q(s.market)}, map_lat = ${lat}, map_lng = ${lng}, map_approximate = true` : ""} where id = ${q(s.id)};`,
    );
  }

  sql.push(
    ...inserts(
      "public.partners",
      [
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
      ],
      partners,
    ),
  );
  sql.push(
    ...inserts(
      "public.institutions",
      ["id", "name", "type", "contact_name", "phone", "email", "is_anchor", "notes"],
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
        "created_at",
      ],
      handovers.map((h) => ({ ...h, item_ids: `{${h.item_ids.join(",")}}` })),
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
    "fulfilment",
    "parent_id",
    "handover_id",
    "updated_at",
  ];
  const ordered = [...items].sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0));
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
        "shop_owner_id",
        "amount_paise",
        "method",
        "paid_at",
        "reference",
        "internal_note",
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
    `select setval(pg_get_serial_sequence('public.shop_submissions', 'id'), greatest((select max(id) from public.shop_submissions), 1));`,
  );
  sql.push(
    ...inserts("public.link_visits", ["slug", "source", "medium", "visited_at"], visits, 1000),
  );
  sql.push(
    ...inserts(
      "public.notifications",
      ["user_id", "kind", "title", "body", "href", "created_at", "read_at"],
      notifications,
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
    end: end.toISOString().slice(0, 10),
    items: items.length,
    intake: items.filter((i) => i.source_type !== "stripped").length,
    parts: items.filter((i) => i.source_type === "stripped").length,
    sold: items.filter((i) => i.status === "sold").length,
    listed: items.filter((i) => i.status === "listed").length,
    handovers: handovers.length,
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

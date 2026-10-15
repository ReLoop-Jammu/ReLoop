import { BUSINESS_RULES } from "@/config/business-rules";
import { SITE } from "@/lib/site";

/** The public rate card per kg (published terms); the database setting overrides it. */
const RATE_CARD_DEFAULT = {
  screens: 17_000,
  batteries: 80_000,
  boards: 13_000,
  other: 500,
  asOf: "2026-10-15",
};
const ROUTE_MARKETS_DEFAULT: SiteSettings["routeMarkets"] = {
  "Bahu Plaza": { day: "tue", starts_on: "2026-11-03" },
  "Gole Market": { day: "tue", starts_on: "2026-11-03" },
  "Raghunath Bazaar": { day: "fri", starts_on: "2027-01-08" },
  "Residency Road": { day: "fri", starts_on: "2027-01-08" },
};

/**
 * Settings admins change on /hub/settings (table app_settings). These are the
 * defaults the site uses when a setting is empty (null) or there is no
 * database (CI, local). An empty string hides a contact channel.
 */
export type AcceptItem = { title: string; examples: string };

export type SiteSettings = {
  whatsapp: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
  hours: string | null;
  hubAddress: string | null;
  hubOpens: string;
  /** The public rate card, paise per kg (a published term; see /rate-card). */
  rateScreensPaise: number;
  rateBatteriesPaise: number;
  rateBoardsPaise: number;
  rateOtherPaise: number;
  rateCardAsOf: string;
  /** Parts Exchange commission, percent: shown to shops, never to buyers. */
  commissionPct: number;
  /** Institution lot fee, paise. */
  lotFeePaise: number;
  /** Route day per market; a market not listed has no route day yet. */
  routeMarkets: Record<string, { day: "tue" | "fri"; starts_on?: string }>;
  categoryInfo: Record<string, { label?: string; examples?: string }>;
  weightKg: Record<string, number>;
  acceptTake: AcceptItem[];
  acceptDont: string[];
  gradeBFactor: number;
  referenceFreshDays: number;
};

export const DEFAULT_ACCEPT_TAKE: AcceptItem[] = [
  {
    title: "Phones and tablets",
    examples:
      "Dead or working handsets and trade-ins, display units, phones a retailer won't resell",
  },
  { title: "Laptops", examples: "Any brand, including ones that don't switch on" },
  {
    title: "Desktops and monitors",
    examples: "Old PCs and LCD or LED monitors, from institutions",
  },
  {
    title: "Screens and displays (paid by the kilo)",
    examples: "Loose phone, tablet and laptop display assemblies",
  },
  {
    title: "Batteries (paid by the kilo)",
    examples: "Lithium phone, laptop and tablet cells",
  },
  { title: "Dead motherboards (paid by the kilo)", examples: "Phone, laptop and tablet boards" },
  {
    title: "Working parts (priced one by one after testing)",
    examples: "Boards, cameras, charging ports, laptop RAM and SSDs, healthy batteries",
  },
  {
    title: "Repair leftovers (paid by the kilo)",
    examples: "Covers, sensors, accessories and other phone and laptop repair leftovers",
  },
];

export const DEFAULT_ACCEPT_DONT = [
  "TVs, printers, UPS units and small appliances, even as scrap.",
  "Large appliances: fridges, washing machines and air conditioners.",
  "Anything from homes: we buy from shops, retailers and institutions only.",
  "Lead-acid batteries, and any leaking battery.",
  "Anything that isn't electrical or electronic.",
];

/** Estimated kg per item when an item has no measured weight (labelled "estimated"). */
export const DEFAULT_WEIGHT_KG: Record<string, number> = {
  phone: 0.2,
  laptop: 2.2,
  desktop: 8,
  monitor: 4.5,
  accessory: 0.3,
  part: 0.2,
};

export const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp: SITE.whatsapp,
  supportPhone: SITE.supportPhone,
  supportEmail: SITE.supportEmail,
  hours: SITE.hours,
  hubAddress: SITE.hubAddress,
  hubOpens: SITE.hubOpens,
  rateScreensPaise: RATE_CARD_DEFAULT.screens,
  rateBatteriesPaise: RATE_CARD_DEFAULT.batteries,
  rateBoardsPaise: RATE_CARD_DEFAULT.boards,
  rateOtherPaise: RATE_CARD_DEFAULT.other,
  rateCardAsOf: RATE_CARD_DEFAULT.asOf,
  commissionPct: BUSINESS_RULES.partCommissionShare * 100,
  lotFeePaise: BUSINESS_RULES.institutionLotFeePaise,
  routeMarkets: ROUTE_MARKETS_DEFAULT,
  categoryInfo: {},
  weightKg: DEFAULT_WEIGHT_KG,
  acceptTake: DEFAULT_ACCEPT_TAKE,
  acceptDont: DEFAULT_ACCEPT_DONT,
  gradeBFactor: 0.75,
  referenceFreshDays: 180,
};

/** Database key → field, for the public settings. */
export const PUBLIC_KEYS: Record<string, keyof SiteSettings> = {
  "contact.whatsapp": "whatsapp",
  "contact.phone": "supportPhone",
  "contact.email": "supportEmail",
  "contact.hours": "hours",
  "hub.address": "hubAddress",
  "hub.opens": "hubOpens",
  "rate_card.screens_paise": "rateScreensPaise",
  "rate_card.batteries_paise": "rateBatteriesPaise",
  "rate_card.boards_paise": "rateBoardsPaise",
  "rate_card.other_paise": "rateOtherPaise",
  "rate_card.as_of": "rateCardAsOf",
  "rate_card.commission_pct": "commissionPct",
  "institution.lot_fee_paise": "lotFeePaise",
  "route.markets": "routeMarkets",
  "categories.info": "categoryInfo",
  "categories.weight_kg": "weightKg",
  "accept.take": "acceptTake",
  "accept.dont": "acceptDont",
  "pricing.grade_b_factor": "gradeBFactor",
  "pricing.reference_fresh_days": "referenceFreshDays",
};

const EMPTY_MEANS_DEFAULT = new Set<keyof SiteSettings>([
  "acceptTake",
  "acceptDont",
  "weightKg",
  "routeMarkets",
]);

/**
 * Applies the stored public settings over the defaults. null keeps the
 * default; "" hides a contact channel; empty lists or maps where the site
 * needs content keep the default.
 */
export function mergeSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const out: SiteSettings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    const field = PUBLIC_KEYS[key];
    if (!field || value === null || value === undefined) continue;
    const empty = Array.isArray(value)
      ? value.length === 0
      : typeof value === "object" && Object.keys(value as object).length === 0;
    if (empty && EMPTY_MEANS_DEFAULT.has(field)) continue;
    const expected = typeof DEFAULT_SETTINGS[field];
    if (
      field === "whatsapp" ||
      field === "supportPhone" ||
      field === "supportEmail" ||
      field === "hours" ||
      field === "hubAddress"
    ) {
      if (typeof value === "string") (out as Record<string, unknown>)[field] = value.trim() || null;
      continue;
    }
    if (Array.isArray(DEFAULT_SETTINGS[field]) ? Array.isArray(value) : typeof value === expected)
      (out as Record<string, unknown>)[field] = value;
  }
  if (out.whatsapp) out.whatsapp = out.whatsapp.replace(/\D/g, "") || null;
  return out;
}

export const hasContact = (s: Pick<SiteSettings, "whatsapp" | "supportEmail">) =>
  Boolean(s.whatsapp || s.supportEmail);

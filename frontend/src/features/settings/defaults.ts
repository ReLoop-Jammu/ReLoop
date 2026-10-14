import { SITE } from "@/lib/site";

/**
 * Settings admins change on /hub/settings (table app_settings). These are the
 * defaults the site uses when a setting is empty (null) or there is no
 * database (CI, local). An empty string hides a contact channel.
 */
export type DropoffShop = {
  name: string;
  market: string;
  lat?: number;
  lng?: number;
  description?: string;
};
export type AcceptItem = { title: string; examples: string };

export type SiteSettings = {
  whatsapp: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
  hours: string | null;
  hubAddress: string | null;
  hubOpens: string;
  dropoffShops: DropoffShop[];
  categoryInfo: Record<string, { label?: string; examples?: string }>;
  weightKg: Record<string, number>;
  acceptTake: AcceptItem[];
  acceptDont: string[];
  gradeBFactor: number;
  referenceFreshDays: number;
};

export const DEFAULT_ACCEPT_TAKE: AcceptItem[] = [
  { title: "Phones and tablets", examples: "Smartphones, feature phones, tablets" },
  { title: "Laptops", examples: "Any brand, including ones that don't switch on" },
  { title: "Desktops", examples: "CPU cabinets, all-in-ones, lab and office PCs" },
  { title: "Monitors", examples: "LCD and LED monitors" },
  { title: "TVs", examples: "LCD, LED and smart TVs" },
  { title: "Printers", examples: "Inkjet and laser printers" },
  { title: "UPS units", examples: "Desktop and office UPS units" },
  { title: "Small appliances", examples: "Mixers, irons, fans and similar" },
  {
    title: "Accessories and parts",
    examples: "Chargers, cables, keyboards, mice, boards, RAM, hard drives, screens",
  },
];

export const DEFAULT_ACCEPT_DONT = [
  "Large appliances: fridges, washing machines and air conditioners.",
  "Anything that isn't electrical or electronic.",
  "Leaking or swollen batteries, except handed over at the hub, where they go straight into the battery cabinet for the recycler.",
];

/** Estimated kg per item when an item has no measured weight (labelled "estimated"). */
export const DEFAULT_WEIGHT_KG: Record<string, number> = {
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

export const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp: SITE.whatsapp,
  supportPhone: SITE.supportPhone,
  supportEmail: SITE.supportEmail,
  hours: SITE.hours,
  hubAddress: SITE.hubAddress,
  hubOpens: SITE.hubOpens,
  dropoffShops: [],
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
  "dropoff.shops": "dropoffShops",
  "categories.info": "categoryInfo",
  "categories.weight_kg": "weightKg",
  "accept.take": "acceptTake",
  "accept.dont": "acceptDont",
  "pricing.grade_b_factor": "gradeBFactor",
  "pricing.reference_fresh_days": "referenceFreshDays",
};

const EMPTY_MEANS_DEFAULT = new Set<keyof SiteSettings>(["acceptTake", "acceptDont", "weightKg"]);

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

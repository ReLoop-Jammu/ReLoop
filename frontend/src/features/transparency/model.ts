import { toCsv } from "@/features/hub/csv";

export type LedgerRow = {
  date: string;
  source: "ReLoop hub" | "Institution lot";
  institution: string | null;
  screens_kg: number | string;
  boards_kg: number | string;
  other_kg: number | string;
  d_devices_kg: number | string;
  batteries_kg: number | string;
  before_bins_kg: number | string;
  total_kg: number | string;
  receipt_ref: string | null;
};

export type MonthRow = {
  month: string;
  kg_weighed: number | string;
  weighins: number | string;
  kg_to_vrrg: number | string;
  devices_received: number | string;
  devices_resold: number | string;
  parts_sold: number | string;
  institution_lots: number | string;
  partner_shops: number | string;
};

export type ActivityRow = {
  day: string;
  kind: "weighin" | "listed" | "sold" | "institution_lot";
  category: string;
  place: string | null;
  who: string | null;
};

export const LEDGER_COLUMNS = [
  ["date", "Date of the handover"],
  ["source", "ReLoop hub, or an institution lot collected on its behalf"],
  ["institution", "The institution's name, only if it agreed to be named"],
  ["screens_kg", "Screens bin, kg"],
  ["boards_kg", "Boards bin, kg"],
  ["other_kg", "Everything-else bin, kg"],
  ["d_devices_kg", "Grade D devices, kg"],
  ["batteries_kg", "Batteries, kg"],
  ["before_bins_kg", "Handovers recorded before the bins existed, kg"],
  ["total_kg", "Total kg on the weight receipt"],
  ["receipt_ref", "VRRG Group's receipt number (ReLoop's own handovers only)"],
] as const;

export const MONTH_COLUMNS = [
  ["month", "First day of the month"],
  ["kg_weighed", "Scrap weighed at partner counters, kg"],
  ["weighins", "Counter weigh-ins"],
  ["kg_to_vrrg", "Handed to VRRG Group, kg (from the ledger)"],
  ["devices_received", "Devices tagged at the hub"],
  ["devices_resold", "Devices sold"],
  ["parts_sold", "Tested parts sold"],
  ["institution_lots", "Institution lots collected"],
  ["partner_shops", "Active partner shops by the end of the month"],
] as const;

export function rowsCsv<T extends Record<string, unknown>>(
  columns: readonly (readonly [string, string])[],
  rows: readonly T[],
) {
  return toCsv([
    columns.map(([k]) => k),
    ...rows.map((r) => columns.map(([k]) => (r[k] ?? "") as string | number)),
  ]);
}

/** "2026-11" from "2026-11-01"; null for anything that isn't a month. */
export const monthSlug = (month: string) => (/^\d{4}-\d{2}/.test(month) ? month.slice(0, 7) : null);
export const isMonthSlug = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export const longMonth = (slug: string) =>
  new Date(`${slug}-01T12:00:00+05:30`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

/** In the simulation, months are "Simulated month N" (1 = the first month with data). */
export function monthTitle(slug: string, allSlugs: readonly string[], simulation: boolean) {
  if (!simulation) return longMonth(slug);
  const n = [...allSlugs].sort().indexOf(slug) + 1;
  return `Simulated month ${n > 0 ? n : "?"}`;
}

const CATEGORY_WORD: Record<string, string> = {
  phone: "phone",
  laptop: "laptop",
  desktop: "desktop",
  monitor: "monitor",
  tablet: "tablet",
  accessory: "accessory",
  part: "tested part",
};

/** One plain sentence per event: no shop, person or price. */
export function activitySentence(a: ActivityRow): string {
  const c = CATEGORY_WORD[a.category] ?? a.category.replace(/_/g, " ");
  switch (a.kind) {
    case "weighin":
      return `Scrap weighed at a ${a.who === "Retailers" ? "retailer" : "repair shop"} in ${a.place ?? "Jammu"}`;
    case "listed":
      return `A ${c} was listed in the shop`;
    case "sold":
      return `A ${c} found a new owner`;
    case "institution_lot":
      return `A lot was collected from a ${c}`;
  }
}

export const num = (v: number | string | null | undefined) =>
  v === null || v === undefined ? 0 : Number(v);

import { toCsv } from "@/features/hub/csv";
import type { Benchmarks, MarginRow } from "./api";

const n = (v: number | string | null | undefined) =>
  v === null || v === undefined ? null : Number(v);
const avg = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
const IN_STOCK = new Set(["graded", "listed", "reserved"]);

export type GroupStats = {
  key: string;
  category: string;
  grade: string;
  sold: number;
  inStock: number;
  avgBuy: number | null;
  avgSale: number | null;
  avgCogs: number | null;
  avgMargin: number | null;
  avgDaysToSell: number | null;
  /** Sold out of sold plus still in stock (0 to 1), or null when there is nothing yet. */
  sellThrough: number | null;
};

/** Per category and grade: what we pay, what it sells for, COGS, days to sell and sell-through. */
export function groupStats(rows: readonly MarginRow[]): GroupStats[] {
  const by = new Map<string, MarginRow[]>();
  for (const r of rows) {
    if (r.commission_item || !r.grade) continue;
    const label = r.category === "part" ? `part: ${r.part_type ?? "other"}` : r.category;
    const key = `${label} · ${r.grade}`;
    by.set(key, [...(by.get(key) ?? []), r]);
  }
  return [...by.entries()]
    .map(([key, list]) => {
      const sold = list.filter((r) => r.sold_at && n(r.sold_paise) !== null);
      const inStock = list.filter((r) => IN_STOCK.has(r.status)).length;
      return {
        key,
        category: key.split(" · ")[0],
        grade: list[0].grade!,
        sold: sold.length,
        inStock,
        avgBuy: avg(list.map((r) => n(r.buy_paise)!)),
        avgSale: avg(sold.map((r) => n(r.sold_paise)!)),
        avgCogs: avg(sold.map((r) => n(r.cogs_paise)!)),
        avgMargin: avg(sold.map((r) => n(r.margin_paise)).filter((x): x is number => x !== null)),
        avgDaysToSell: avg(sold.map((r) => r.days_to_sell).filter((x): x is number => x !== null)),
        sellThrough: sold.length + inStock ? sold.length / (sold.length + inStock) : null,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Average buy and sale price of items sold each month (by sale month). */
export function monthlyBuyVsSale(rows: readonly MarginRow[]) {
  const by = new Map<string, { buy: number[]; sale: number[] }>();
  for (const r of rows) {
    if (!r.sold_at || r.commission_item || n(r.sold_paise) === null) continue;
    const m = r.sold_at.slice(0, 7);
    const e = by.get(m) ?? { buy: [], sale: [] };
    e.buy.push(n(r.buy_paise)!);
    e.sale.push(n(r.sold_paise)!);
    by.set(m, e);
  }
  return [...by.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, e]) => ({
      month,
      sold: e.sale.length,
      avgBuy: avg(e.buy)!,
      avgSale: avg(e.sale)!,
    }));
}

export type Flag = { itemId?: string; bin?: string; message: string };

/**
 * Flags against the plan's unit figures only (no margin target). A sold device
 * whose margin is under the per-device figure; a bin whose VRRG rate minus our
 * rate card is under the per-kg spread. Nothing is flagged while a figure is unset.
 */
export function pricingFlags(rows: readonly MarginRow[], b: Benchmarks): Flag[] {
  const flags: Flag[] = [];
  const device = b["finance.device_unit_paise"];
  if (typeof device === "number")
    for (const r of rows) {
      const m = n(r.margin_paise);
      if (r.category === "part" || r.commission_item || m === null) continue;
      if (m < device)
        flags.push({ itemId: r.item_id, message: `${r.item_id} sold below the per-device figure` });
    }
  const spread = b["finance.scrap_spread_paise_per_kg"];
  const vrg = b["vrg.rates_paise"];
  if (typeof spread === "number" && vrg && typeof vrg === "object") {
    const card: Record<string, number | undefined> = {
      screens: b["rate_card.screens_paise"],
      boards: b["rate_card.boards_paise"],
      batteries: b["rate_card.batteries_paise"],
      other: b["rate_card.other_paise"],
    };
    for (const [bin, ours] of Object.entries(card)) {
      const theirs = vrg[bin];
      if (typeof ours !== "number" || typeof theirs !== "number") continue;
      if (theirs - ours < spread)
        flags.push({
          bin,
          message: `The ${bin} spread (VRRG rate minus our rate card) is under the per-kg figure`,
        });
    }
  }
  return flags;
}

export const benchmarksSet = (b: Benchmarks) => ({
  device: typeof b["finance.device_unit_paise"] === "number",
  spread: typeof b["finance.scrap_spread_paise_per_kg"] === "number",
  vrg: !!b["vrg.rates_paise"] && typeof b["vrg.rates_paise"] === "object",
});

/** The margins CSV: tags, categories, dates and money only (no supplier names or contacts). */
export function marginsCsv(rows: readonly MarginRow[]): string {
  const rupees = (v: number | string | null) => (v === null ? "" : (Number(v) / 100).toFixed(2));
  return toCsv([
    [
      "Tag",
      "Category",
      "Part type",
      "Grade",
      "Status",
      "Source",
      "Received",
      "Listed",
      "Sold",
      "Days to sell",
      "Buy (Rs)",
      "Repairs (Rs)",
      "Handling (Rs)",
      "COGS (Rs)",
      "Sold for (Rs)",
      "Margin (Rs)",
      "Commission (Rs)",
    ],
    ...rows.map((r) => [
      r.item_id,
      r.category,
      r.part_type ?? "",
      r.grade ?? "",
      r.status,
      r.source_type,
      r.received_at?.slice(0, 10) ?? "",
      r.listed_at?.slice(0, 10) ?? "",
      r.sold_at?.slice(0, 10) ?? "",
      r.days_to_sell ?? "",
      rupees(r.buy_paise),
      rupees(r.repair_paise),
      rupees(r.handling_paise),
      rupees(r.cogs_paise),
      rupees(r.sold_paise),
      rupees(r.margin_paise),
      rupees(r.commission_paise),
    ]),
  ]);
}

/** Within this share of the suggestion, no reason is needed for a different price. */
export const OVERRIDE_TOLERANCE = 0.1;
/** True when a price differs enough from the suggestion that staff must say why. */
export const needsOverrideReason = (
  pricePaise: number | null,
  suggestionPaise: number | null | undefined,
) =>
  pricePaise !== null &&
  typeof suggestionPaise === "number" &&
  suggestionPaise > 0 &&
  Math.abs(pricePaise - suggestionPaise) / suggestionPaise > OVERRIDE_TOLERANCE;

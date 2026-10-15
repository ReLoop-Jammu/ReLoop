import { BUSINESS_RULES } from "@/config/business-rules";
import type { Item } from "@/features/inventory/model";
import type { BinStatus, Weighin } from "@/features/scrap/api";

export type TodaySummary = {
  received: number;
  listed: number;
  sold: number;
  weighins: number;
  weighedKg: number;
  bins: { bin: BinStatus["bin"]; kg: number; fillPct: number; near: boolean; due: boolean }[];
};

/** The calendar day in India as "YYYY-MM-DD", whatever the viewer's time zone. */
export const istDay = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/**
 * The day's counts for the overview: items received, listed and sold today,
 * today's counter weigh-ins and kilograms, and how full each scrap bin is
 * against the handover limit. Pure, so it can be tested.
 */
export function todaySummary(
  items: readonly Item[],
  weighins: readonly Weighin[],
  bins: readonly BinStatus[],
  now: Date,
): TodaySummary {
  const today = istDay(now);
  const on = (iso?: string) => Boolean(iso) && istDay(iso!) === today;
  const todays = weighins.filter((w) => on(w.weighed_at));
  const kg = todays.reduce(
    (s, w) =>
      s + Number(w.screens_kg) + Number(w.boards_kg) + Number(w.batteries_kg) + Number(w.other_kg),
    0,
  );
  return {
    received: items.filter((i) => on(i.receivedAt)).length,
    listed: items.filter((i) => on(i.listedAt)).length,
    sold: items.filter((i) => on(i.soldAt)).length,
    weighins: todays.length,
    weighedKg: Math.round(kg * 10) / 10,
    bins: bins.map((b) => ({
      bin: b.bin,
      kg: b.kg,
      fillPct: Math.min(100, Math.round((b.kg / BUSINESS_RULES.bins.handoverKg) * 100)),
      near: b.near_limit,
      due: b.due,
    })),
  };
}

import type { Handover, Item, Partner } from "./model";
import { daysBetween } from "./rules";

export type MonthStats = {
  month: string; // YYYY-MM
  itemsIn: number;
  graded: number;
  gradeMix: Record<"A" | "B" | "C" | "D", number>;
  /** (A + B + C) ÷ graded. null when nothing is graded yet. */
  reuseShare: number | null;
  sold: number;
  scrapKg: number;
};

export type DashboardStats = {
  months: MonthStats[];
  onRacks: number;
  /** Average days on the racks for items not yet sold or recycled. */
  avgStockAgeDays: number | null;
  activePartners: number;
};

const monthOf = (iso: string) => iso.slice(0, 7);
const ON_RACKS = new Set([
  "received",
  "graded",
  "out_for_repair",
  "stripping",
  "listed",
  "reserved",
]);

export function dashboardStats(
  items: readonly Item[],
  handovers: readonly Handover[],
  partners: readonly Partner[],
  now: Date,
): DashboardStats {
  const byMonth = new Map<string, MonthStats>();
  const get = (m: string) => {
    let s = byMonth.get(m);
    if (!s) {
      s = {
        month: m,
        itemsIn: 0,
        graded: 0,
        gradeMix: { A: 0, B: 0, C: 0, D: 0 },
        reuseShare: null,
        sold: 0,
        scrapKg: 0,
      };
      byMonth.set(m, s);
    }
    return s;
  };

  // Parts stripped from a C item are not new intake; count only original items.
  for (const i of items.filter((x) => x.source.type !== "stripped")) {
    const s = get(monthOf(i.receivedAt));
    s.itemsIn += 1;
    if (i.grade) {
      s.graded += 1;
      s.gradeMix[i.grade] += 1;
    }
  }
  for (const i of items) if (i.soldAt) get(monthOf(i.soldAt)).sold += 1;
  for (const h of handovers) {
    const kg = Object.values(h.kgByCategory).reduce((a, b) => a + (b ?? 0), 0) + h.batteryKg;
    get(monthOf(h.date)).scrapKg += kg;
  }
  for (const s of byMonth.values()) {
    s.reuseShare = s.graded ? (s.gradeMix.A + s.gradeMix.B + s.gradeMix.C) / s.graded : null;
  }

  const racks = items.filter((i) => ON_RACKS.has(i.status));
  const avg = racks.length
    ? racks.reduce((sum, i) => sum + daysBetween(i.receivedAt, now), 0) / racks.length
    : null;

  return {
    months: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
    onRacks: racks.length,
    avgStockAgeDays: avg,
    activePartners: partners.filter((p) => p.status === "active").length,
  };
}

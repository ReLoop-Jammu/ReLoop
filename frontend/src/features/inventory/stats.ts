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

export type LoopMonth = {
  month: string; // YYYY-MM
  reservations: number;
  enquiries: number;
  institutionPickups: number;
  submissionsIn: number;
  submissionsOffered: number;
  submissionsPurchased: number;
  /** What ReLoop paid shops for purchased submissions, in paise. */
  purchasedPaise: number;
};

/** Monthly counts for the rest of the loop: public requests and shop submissions. */
export function loopStats(
  requests: readonly { kind: string; created_at: string }[],
  submissions: readonly {
    status: string;
    created_at: string;
    reviewed_at: string | null;
    purchased_at: string | null;
    purchase_price: number | null;
    offer_price: number | null;
  }[],
): LoopMonth[] {
  const byMonth = new Map<string, LoopMonth>();
  const get = (iso: string) => {
    const m = monthOf(iso);
    let s = byMonth.get(m);
    if (!s) {
      s = {
        month: m,
        reservations: 0,
        enquiries: 0,
        institutionPickups: 0,
        submissionsIn: 0,
        submissionsOffered: 0,
        submissionsPurchased: 0,
        purchasedPaise: 0,
      };
      byMonth.set(m, s);
    }
    return s;
  };
  for (const r of requests) {
    const s = get(r.created_at);
    if (r.kind === "reservation") s.reservations += 1;
    else if (r.kind === "enquiry") s.enquiries += 1;
    else if (r.kind === "institution_pickup") s.institutionPickups += 1;
  }
  for (const x of submissions) {
    get(x.created_at).submissionsIn += 1;
    if (x.offer_price !== null && x.reviewed_at) get(x.reviewed_at).submissionsOffered += 1;
    if (x.purchased_at) {
      const s = get(x.purchased_at);
      s.submissionsPurchased += 1;
      s.purchasedPaise += Math.round(Number(x.purchase_price ?? 0) * 100);
    }
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

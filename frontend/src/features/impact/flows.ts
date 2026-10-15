/**
 * Public flow data: the impact_flows and network_flows views (counts and kg
 * only, from weighed records), parsed and shaped for the charts. No names, no
 * money. Everything here is pure so it can be tested.
 */

export type FlowKind = "scrap" | "device" | "part";

export type ImpactFlow = {
  /** First day of the month, "YYYY-MM-01". */
  month: string;
  sourceGroup: string;
  outcome: string;
  kind: FlowKind;
  category: string;
  items: number;
  kg: number;
};

export type NetworkFlow = {
  from: string;
  to: string;
  kind: "scrap" | "device" | "part" | "handover";
  category: string;
  items: number;
  kg: number;
};

type ImpactRow = Record<"month" | "source_group" | "outcome" | "kind" | "category", string> &
  Record<"items" | "kg", number | string>;
type NetworkRow = Record<"from_node" | "to_node" | "kind" | "category", string> &
  Record<"items" | "kg", number | string>;

const KINDS = ["scrap", "device", "part"];
const NETWORK_KINDS = ["scrap", "device", "part", "handover"];
const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : NaN);

export function parseImpactFlows(rows: unknown): ImpactFlow[] {
  if (!Array.isArray(rows)) return [];
  const out: ImpactFlow[] = [];
  for (const r of rows as ImpactRow[]) {
    const items = num(r?.items);
    const kg = num(r?.kg);
    if (!r || !KINDS.includes(r.kind) || Number.isNaN(items) || Number.isNaN(kg)) continue;
    out.push({
      month: String(r.month).slice(0, 7) + "-01",
      sourceGroup: r.source_group,
      outcome: r.outcome,
      kind: r.kind as FlowKind,
      category: r.category,
      items,
      kg,
    });
  }
  return out;
}

export function parseNetworkFlows(rows: unknown): NetworkFlow[] {
  if (!Array.isArray(rows)) return [];
  const out: NetworkFlow[] = [];
  for (const r of rows as NetworkRow[]) {
    const items = num(r?.items);
    const kg = num(r?.kg);
    if (!r || !NETWORK_KINDS.includes(r.kind) || Number.isNaN(items) || Number.isNaN(kg)) continue;
    out.push({
      from: r.from_node,
      to: r.to_node,
      kind: r.kind as NetworkFlow["kind"],
      category: r.category,
      items,
      kg,
    });
  }
  return out;
}

export type ImpactSummary = {
  scrapKg: number;
  scrapToVrrgKg: number;
  devices: number;
  parts: number;
  months: { month: string; scrapKg: number; items: number }[];
};

export function summariseImpact(flows: readonly ImpactFlow[]): ImpactSummary {
  const months = new Map<string, { scrapKg: number; items: number }>();
  let scrapKg = 0;
  let scrapToVrrgKg = 0;
  let devices = 0;
  let parts = 0;
  for (const f of flows) {
    const m = months.get(f.month) ?? { scrapKg: 0, items: 0 };
    if (f.kind === "scrap") {
      scrapKg += f.kg;
      if (f.outcome === "Handed to VRRG Group") scrapToVrrgKg += f.kg;
      m.scrapKg += f.kg;
    } else {
      m.items += f.items;
      if (f.kind === "device") devices += f.items;
      else parts += f.items;
    }
    months.set(f.month, m);
  }
  return {
    scrapKg: round1(scrapKg),
    scrapToVrrgKg: round1(scrapToVrrgKg),
    devices,
    parts,
    months: [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, scrapKg: round1(v.scrapKg), items: v.items })),
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export type Link = { source: string; target: string; value: number };

/** Source group to outcome links, summed over months, for one measure. */
export function impactLinks(flows: readonly ImpactFlow[], measure: "kg" | "items"): Link[] {
  const sums = new Map<string, Link>();
  for (const f of flows) {
    if ((measure === "kg") !== (f.kind === "scrap")) continue;
    const value = measure === "kg" ? f.kg : f.items;
    if (value <= 0) continue;
    const key = `${f.sourceGroup}\u0000${f.outcome}`;
    const l = sums.get(key) ?? { source: f.sourceGroup, target: f.outcome, value: 0 };
    l.value += value;
    sums.set(key, l);
  }
  return [...sums.values()].map((l) => ({ ...l, value: round1(l.value) }));
}

/** "2026-11-01" as "Nov 2026". */
export const monthLabel = (month: string) =>
  new Date(`${month.slice(0, 7)}-01T12:00:00+05:30`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

/** The hub-to-buyer-area edges, biggest first (the view already hides areas under 3 items). */
export function buyerAreaEdges(flows: readonly NetworkFlow[]) {
  const by = new Map<string, number>();
  for (const f of flows)
    if (
      f.from === "ReLoop hub" &&
      (f.kind === "device" || f.kind === "part") &&
      f.to !== "VRRG Group"
    )
      by.set(f.to, (by.get(f.to) ?? 0) + f.items);
  return [...by.entries()]
    .map(([area, items]) => ({ area, items }))
    .sort((a, b) => b.items - a.items);
}

/** Market-to-hub edges: kg of scrap and items by market. */
export function marketEdges(flows: readonly NetworkFlow[]) {
  const by = new Map<string, { kg: number; items: number }>();
  for (const f of flows) {
    if (f.to !== "ReLoop hub") continue;
    const m = by.get(f.from) ?? { kg: 0, items: 0 };
    m.kg += f.kg;
    if (f.kind !== "scrap") m.items += f.items;
    by.set(f.from, m);
  }
  return [...by.entries()]
    .map(([market, v]) => ({ market, kg: round1(v.kg), items: v.items }))
    .sort((a, b) => b.kg + b.items - (a.kg + a.items));
}

/** Kilograms handed to VRRG Group, by bin. */
export function vrrgEdges(flows: readonly NetworkFlow[]) {
  const by = new Map<string, number>();
  for (const f of flows)
    if (f.to === "VRRG Group") by.set(f.category, (by.get(f.category) ?? 0) + f.kg);
  return [...by.entries()].map(([category, kg]) => ({ category, kg: round1(kg) }));
}

export const flowsAreThin = (flows: readonly { items: number; kg: number }[]) =>
  !flows.some((f) => f.items > 0 || f.kg > 0);

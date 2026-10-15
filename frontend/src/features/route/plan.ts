import { LOCATIONS } from "@/config/locations";

export type RouteStop = {
  stop_kind: "standing" | "pickup";
  market: string;
  name: string;
  phone: string | null;
  partner_id: string | null;
  partner_type: string | null;
  pickup_id: string | null;
  pickup_source: "shop" | "institution" | null;
  expected_items: number | null;
  item_label: string | null;
  times_missed: number;
  last_weighed_at: string | null;
  last_kg: number | string | null;
};

export const ROUTE_WEEKDAYS = { Tuesday: 2, Friday: 5 } as const;

/** The next `count` route days (Tuesdays and Fridays) from `from`, as "YYYY-MM-DD", today included. */
export function nextRouteDays(from: Date, count = 4): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
  while (out.length < count) {
    const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    if (dow === 2 || dow === 5) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** "Tuesday 10 Nov": a route day for the buttons and the sheet heading. */
export function routeDayLabel(iso: string) {
  return new Date(`${iso}T12:00:00+05:30`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

/** The markets of the route that runs on this weekday, in driving order. */
export function clusterMarkets(iso: string): string[] {
  const day = new Date(`${iso}T12:00:00+05:30`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Asia/Kolkata",
  });
  const route = LOCATIONS.routes.find((r) => r.day === day);
  return route ? [...route.markets] : [];
}

export type StopGroup = { market: string; stops: RouteStop[] };

/**
 * Stops grouped by market in the route's driving order (the cluster's markets
 * first, any other market after, institutions last), standing stops before
 * booked lots, then by name.
 */
export function groupStops(stops: readonly RouteStop[], iso: string): StopGroup[] {
  const order = clusterMarkets(iso).map((m) => m.toLowerCase());
  const rank = (market: string) => {
    if (market === "Institutions") return 1_000_000;
    const i = order.indexOf(market.toLowerCase());
    return i === -1 ? 1000 : i;
  };
  const by = new Map<string, RouteStop[]>();
  for (const s of stops) by.set(s.market, [...(by.get(s.market) ?? []), s]);
  return [...by.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([market, list]) => ({
      market,
      stops: [...list].sort(
        (a, b) =>
          Number(a.stop_kind === "pickup") - Number(b.stop_kind === "pickup") ||
          a.name.localeCompare(b.name),
      ),
    }));
}

/** A one-line description of what to expect at a stop. */
export function expectation(s: RouteStop): string {
  if (s.stop_kind === "pickup") {
    if (s.pickup_source === "institution") return "Booked institution lot";
    const n = s.expected_items;
    return `Booked lot${s.item_label ? `: ${s.item_label}` : ""}${n ? ` (${n} ${n === 1 ? "item" : "items"})` : ""}`;
  }
  if (s.last_weighed_at && s.last_kg !== null && Number(s.last_kg) > 0) {
    const day = new Date(s.last_weighed_at).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Kolkata",
    });
    return `Weekly stop. Last weighed ${Number(s.last_kg).toFixed(1)} kg on ${day}`;
  }
  return "Weekly stop. Not weighed yet";
}

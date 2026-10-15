import { describe, expect, it } from "vitest";
import {
  clusterMarkets,
  expectation,
  groupStops,
  nextRouteDays,
  routeDayLabel,
  type RouteStop,
} from "./plan";

const stop = (o: Partial<RouteStop>): RouteStop => ({
  stop_kind: "standing",
  market: "Bahu Plaza",
  name: "A",
  phone: null,
  partner_id: null,
  partner_type: null,
  pickup_id: null,
  pickup_source: null,
  expected_items: null,
  item_label: null,
  times_missed: 0,
  last_weighed_at: null,
  last_kg: null,
  ...o,
});

describe("route days", () => {
  it("lists the next Tuesdays and Fridays, today included", () => {
    // Monday 9 Nov 2026
    expect(nextRouteDays(new Date(2026, 10, 9), 4)).toEqual([
      "2026-11-10",
      "2026-11-13",
      "2026-11-17",
      "2026-11-20",
    ]);
    // On a Tuesday itself
    expect(nextRouteDays(new Date(2026, 10, 10), 2)).toEqual(["2026-11-10", "2026-11-13"]);
  });

  it("names the day and the cluster's markets in driving order", () => {
    expect(routeDayLabel("2026-11-10")).toMatch(/^Tuesday/);
    expect(clusterMarkets("2026-11-10")).toEqual(["Bahu Plaza", "Gole Market"]);
    expect(clusterMarkets("2026-11-13")).toEqual(["Raghunath Bazaar", "Residency Road"]);
    expect(clusterMarkets("2026-11-11")).toEqual([]);
  });
});

describe("groupStops", () => {
  it("orders markets as the route drives them, other markets after, institutions last", () => {
    const groups = groupStops(
      [
        stop({ market: "Institutions", name: "GGM College", stop_kind: "pickup" }),
        stop({ market: "Gole Market", name: "Z Shop" }),
        stop({ market: "Other Jammu markets", name: "Odd Shop" }),
        stop({ market: "Bahu Plaza", name: "B Shop" }),
        stop({ market: "Bahu Plaza", name: "Booked Lot", stop_kind: "pickup" }),
        stop({ market: "Bahu Plaza", name: "A Shop" }),
      ],
      "2026-11-10",
    );
    expect(groups.map((g) => g.market)).toEqual([
      "Bahu Plaza",
      "Gole Market",
      "Other Jammu markets",
      "Institutions",
    ]);
    expect(groups[0].stops.map((s) => s.name)).toEqual(["A Shop", "B Shop", "Booked Lot"]);
  });
});

describe("expectation", () => {
  it("says what to expect at each kind of stop", () => {
    expect(expectation(stop({}))).toBe("Weekly stop. Not weighed yet");
    expect(expectation(stop({ last_weighed_at: "2026-11-03T05:00:00Z", last_kg: "35.5" }))).toBe(
      "Weekly stop. Last weighed 35.5 kg on 3 Nov",
    );
    expect(
      expectation(
        stop({
          stop_kind: "pickup",
          pickup_source: "shop",
          item_label: "Routers",
          expected_items: 4,
        }),
      ),
    ).toBe("Booked lot: Routers (4 items)");
    expect(expectation(stop({ stop_kind: "pickup", pickup_source: "institution" }))).toBe(
      "Booked institution lot",
    );
  });
});

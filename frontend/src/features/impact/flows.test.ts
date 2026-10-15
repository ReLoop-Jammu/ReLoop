import { describe, expect, it } from "vitest";
import {
  buyerAreaEdges,
  flowsAreThin,
  impactLinks,
  marketEdges,
  parseImpactFlows,
  parseNetworkFlows,
  summariseImpact,
  vrrgEdges,
} from "./flows";
import { layoutSankey } from "./sankey";

const impact = parseImpactFlows([
  {
    month: "2026-11-01",
    source_group: "Repair shops",
    outcome: "At the hub",
    kind: "scrap",
    category: "screens",
    items: "2",
    kg: "40.5",
  },
  {
    month: "2026-11-01",
    source_group: "Retailers",
    outcome: "Handed to VRRG Group",
    kind: "scrap",
    category: "boards",
    items: 1,
    kg: 10,
  },
  {
    month: "2026-12-01",
    source_group: "Repair shops",
    outcome: "Handed to VRRG Group",
    kind: "scrap",
    category: "other",
    items: 3,
    kg: 20,
  },
  {
    month: "2026-12-01",
    source_group: "Repair shops",
    outcome: "Resold as devices",
    kind: "device",
    category: "phone",
    items: 4,
    kg: 0,
  },
  {
    month: "2026-12-01",
    source_group: "Stripped from devices",
    outcome: "Sold as tested parts",
    kind: "part",
    category: "screen",
    items: 2,
    kg: 0,
  },
  {
    month: "2026-12-01",
    source_group: "x",
    outcome: "y",
    kind: "bogus",
    category: "z",
    items: 1,
    kg: 1,
  },
  {
    month: "2026-12-01",
    source_group: "x",
    outcome: "y",
    kind: "scrap",
    category: "z",
    items: -1,
    kg: 1,
  },
]);

describe("parsing", () => {
  it("drops rows with an unknown kind or a bad number, and reads numeric strings", () => {
    expect(impact).toHaveLength(5);
    expect(impact[0]).toMatchObject({ kg: 40.5, items: 2, month: "2026-11-01" });
    expect(parseImpactFlows(null)).toEqual([]);
    expect(parseNetworkFlows("x")).toEqual([]);
  });
});

describe("summaries", () => {
  it("adds up kg, items and months without double counting", () => {
    const s = summariseImpact(impact);
    expect(s.scrapKg).toBe(70.5);
    expect(s.scrapToVrrgKg).toBe(30);
    expect(s.devices).toBe(4);
    expect(s.parts).toBe(2);
    expect(s.months.map((m) => m.month)).toEqual(["2026-11-01", "2026-12-01"]);
    expect(s.months[1]).toEqual({ month: "2026-12-01", scrapKg: 20, items: 6 });
  });

  it("builds kg links from scrap only and item links from devices and parts", () => {
    const kg = impactLinks(impact, "kg");
    expect(kg.reduce((s, l) => s + l.value, 0)).toBe(70.5);
    expect(kg.find((l) => l.source === "Repair shops" && l.target === "At the hub")?.value).toBe(
      40.5,
    );
    const items = impactLinks(impact, "items");
    expect(items.map((l) => l.target).sort()).toEqual([
      "Resold as devices",
      "Sold as tested parts",
    ]);
  });

  it("knows when there is nothing to show yet", () => {
    expect(flowsAreThin([])).toBe(true);
    expect(flowsAreThin([{ items: 0, kg: 0 }])).toBe(true);
    expect(flowsAreThin(impact)).toBe(false);
  });
});

describe("network edges", () => {
  const net = parseNetworkFlows([
    {
      from_node: "Bahu Plaza",
      to_node: "ReLoop hub",
      kind: "scrap",
      category: "screens",
      items: 2,
      kg: 30,
    },
    {
      from_node: "Bahu Plaza",
      to_node: "ReLoop hub",
      kind: "device",
      category: "phone",
      items: 3,
      kg: 0.6,
    },
    {
      from_node: "Other Jammu markets",
      to_node: "ReLoop hub",
      kind: "scrap",
      category: "boards",
      items: 1,
      kg: 5,
    },
    {
      from_node: "ReLoop hub",
      to_node: "Gandhi Nagar",
      kind: "device",
      category: "phone",
      items: 3,
      kg: 0,
    },
    {
      from_node: "ReLoop hub",
      to_node: "Gandhi Nagar",
      kind: "part",
      category: "part",
      items: 4,
      kg: 0,
    },
    {
      from_node: "ReLoop hub",
      to_node: "VRRG Group",
      kind: "handover",
      category: "screens",
      items: 0,
      kg: 30,
    },
  ]);
  it("ranks markets, buyer areas and bins", () => {
    expect(marketEdges(net)[0]).toEqual({ market: "Bahu Plaza", kg: 30.6, items: 3 });
    expect(buyerAreaEdges(net)).toEqual([{ area: "Gandhi Nagar", items: 7 }]);
    expect(vrrgEdges(net)).toEqual([{ category: "screens", kg: 30 }]);
  });
});

describe("layoutSankey", () => {
  it("makes band widths proportional and keeps nodes inside the chart", () => {
    const layout = layoutSankey(impactLinks(impact, "kg"), { height: 200, gap: 10 });
    const total = layout.links.reduce((s, l) => s + l.width, 0);
    expect(
      layout.nodes.filter((n) => n.side === "left").reduce((s, n) => s + n.height, 0),
    ).toBeCloseTo(total);
    for (const n of layout.nodes) expect(n.y + n.height).toBeLessThanOrEqual(200 + 0.001);
    const a = layout.links.find((l) => l.value === 40.5)!;
    const b = layout.links.find((l) => l.value === 10)!;
    expect(a.width / b.width).toBeCloseTo(4.05);
    expect(a.path.startsWith("M")).toBe(true);
  });

  it("returns an empty layout when there is nothing to draw", () => {
    expect(layoutSankey([]).nodes).toEqual([]);
    expect(layoutSankey([{ source: "a", target: "b", value: 0 }]).links).toEqual([]);
  });
});

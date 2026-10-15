import { describe, expect, it } from "vitest";
import type { MarginRow } from "./api";
import {
  groupStats,
  marginsCsv,
  monthlyBuyVsSale,
  needsOverrideReason,
  pricingFlags,
} from "./dashboard";

const row = (o: Partial<MarginRow>): MarginRow => ({
  item_id: "RL-JMU-0001",
  category: "phone",
  part_type: null,
  grade: "A",
  status: "sold",
  source_type: "repair_shop",
  received_at: "2026-11-01T05:00:00Z",
  listed_at: "2026-11-02T05:00:00Z",
  sold_at: "2026-11-10T05:00:00Z",
  days_to_sell: 8,
  buy_paise: 100000,
  repair_paise: 0,
  handling_paise: 0,
  cogs_paise: 100000,
  expected_resale_paise: null,
  list_paise: 250000,
  current_paise: 250000,
  sold_paise: 250000,
  commission_item: false,
  commission_pct: null,
  commission_paise: null,
  margin_paise: 150000,
  ...o,
});

const rows = [
  row({}),
  row({
    item_id: "RL-JMU-0002",
    sold_paise: "150000",
    margin_paise: "40000",
    buy_paise: 110000,
    cogs_paise: 110000,
    days_to_sell: 20,
    sold_at: "2026-12-03T05:00:00Z",
  }),
  row({
    item_id: "RL-JMU-0003",
    status: "listed",
    sold_at: null,
    sold_paise: null,
    margin_paise: null,
    days_to_sell: null,
  }),
  row({
    item_id: "RL-JMU-0004",
    category: "part",
    part_type: "screen",
    grade: "C",
    commission_item: true,
    margin_paise: null,
    commission_paise: 12000,
  }),
];

describe("pricing dashboard", () => {
  it("groups by category and grade, leaving shop-listed parts out", () => {
    const g = groupStats(rows);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({
      key: "phone · A",
      sold: 2,
      inStock: 1,
      avgSale: 200000,
      avgMargin: 95000,
      avgDaysToSell: 14,
    });
    expect(g[0].sellThrough).toBeCloseTo(2 / 3);
  });

  it("averages buy and sale by month of sale", () => {
    expect(monthlyBuyVsSale(rows)).toEqual([
      { month: "2026-11", sold: 1, avgBuy: 100000, avgSale: 250000 },
      { month: "2026-12", sold: 1, avgBuy: 110000, avgSale: 150000 },
    ]);
  });

  it("flags only against figures that are set, and never commission items", () => {
    expect(pricingFlags(rows, {})).toEqual([]);
    const f = pricingFlags(rows, {
      "finance.device_unit_paise": 50000,
      "finance.scrap_spread_paise_per_kg": 300,
      "vrg.rates_paise": { screens: 3000, boards: 9000 },
      "rate_card.screens_paise": 2800,
      "rate_card.boards_paise": 5000,
    });
    expect(f.map((x) => x.itemId ?? x.bin)).toEqual(["RL-JMU-0002", "screens"]);
  });

  it("writes a CSV with money in rupees and no supplier columns", () => {
    const csv = marginsCsv(rows);
    const header = csv.split("\n")[0];
    expect(header).not.toMatch(/name|phone|partner|supplier|contact/i);
    expect(csv).toContain("RL-JMU-0002");
    expect(csv).toContain("1500.00");
  });

  it("asks for a reason only when the price is more than 10% off the suggestion", () => {
    expect(needsOverrideReason(105000, 100000)).toBe(false);
    expect(needsOverrideReason(120000, 100000)).toBe(true);
    expect(needsOverrideReason(80000, 100000)).toBe(true);
    expect(needsOverrideReason(120000, null)).toBe(false);
    expect(needsOverrideReason(null, 100000)).toBe(false);
  });
});

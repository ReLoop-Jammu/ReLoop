import { describe, expect, it } from "vitest";
import { BUSINESS_RULES } from "@/config/business-rules";
import { formatItemId, isItemId, nextItemId, parseItemNumber } from "./ids";
import { shipsAcrossIndia, needsDataWipe } from "./model";
import { cutPrice, estimateBuyPrice, likelyGrade } from "./pricing";
import { applyStockRules, hubAlerts } from "./rules";
import { dashboardStats } from "./stats";
import { makeItem } from "./test-helpers";

const day = (n: number) => new Date(Date.parse("2026-11-02T10:00:00.000Z") + n * 86_400_000);

describe("item IDs", () => {
  it("formats the plan's RL-JMU-0001 tag", () => {
    expect(formatItemId(1)).toBe("RL-JMU-0001");
    expect(formatItemId(142)).toBe("RL-JMU-0142");
    expect(formatItemId(12345)).toBe("RL-JMU-12345");
  });

  it("continues after the highest existing tag, ignoring gaps and junk", () => {
    expect(nextItemId([])).toBe("RL-JMU-0001");
    expect(nextItemId(["RL-JMU-0003", "RL-JMU-0010", "nope"])).toBe("RL-JMU-0011");
  });

  it("parses and validates tags", () => {
    expect(parseItemNumber("RL-JMU-0042")).toBe(42);
    expect(isItemId("RL-JMU-0042")).toBe(true);
    expect(isItemId("rl-jmu-42")).toBe(false);
  });
});

describe("buy-price estimate (plan §04)", () => {
  it("pays about 45% of resale for grade A and 25% for grade B", () => {
    const a = estimateBuyPrice("A", 320_000);
    expect(a).toMatchObject({ kind: "range", minPaise: 130_000, maxPaise: 160_000 });
    const b = estimateBuyPrice("B", 240_000);
    expect(b).toMatchObject({ kind: "range", minPaise: 55_000, maxPaise: 65_000 });
  });

  it("pays a flat ₹100–200 for C and nothing for D", () => {
    expect(estimateBuyPrice("C", 999_999)).toMatchObject({ minPaise: 10_000, maxPaise: 20_000 });
    expect(estimateBuyPrice("D", 500_000)).toEqual({ kind: "free_disposal", grade: "D" });
  });

  it("states the rule only when the resale value is unknown", () => {
    expect(estimateBuyPrice("A", null)).toEqual({
      kind: "rule_only",
      grade: "A",
      consignmentEligible: false,
    });
  });

  it("offers consignment (70%) only above ₹10,000", () => {
    expect(estimateBuyPrice("A", 1_000_000)).toMatchObject({ consignmentEligible: false });
    expect(estimateBuyPrice("A", 2_000_000)).toMatchObject({
      consignmentEligible: true,
      consignmentPaise: 1_400_000,
    });
  });

  it("guesses a likely grade from the seller's answers", () => {
    expect(likelyGrade({ powersOn: "yes", allWorking: "yes", hazard: false })).toBe("A");
    expect(likelyGrade({ powersOn: "yes", allWorking: "one_fault", hazard: false })).toBe("B");
    expect(likelyGrade({ powersOn: "yes", allWorking: "several_faults", hazard: false })).toBe("C");
    expect(likelyGrade({ powersOn: "no", allWorking: "unsure", hazard: false })).toBe("C");
    expect(likelyGrade({ powersOn: "yes", allWorking: "yes", hazard: true })).toBe("D");
  });

  it("cuts price by 20%, rounded to ₹10", () => {
    expect(cutPrice(320_000)).toBe(256_000);
    expect(cutPrice(99_900)).toBe(80_000);
  });
});

describe("unsold-stock rules (day 45, day 75)", () => {
  const listed = makeItem();

  it("does nothing before day 45", () => {
    expect(applyStockRules([listed], day(44))).toEqual([]);
  });

  it("cuts the price 20% on day 45, once", () => {
    const [cut] = applyStockRules([listed], day(45));
    expect(cut.currentPaise).toBe(256_000);
    expect(cut.priceCutAt).toBeDefined();
    expect(cut.events.at(-1)?.type).toBe("auto_price_cut");
    expect(applyStockRules([cut], day(60))).toEqual([]);
  });

  it("downgrades to C for stripping on day 75", () => {
    const [down] = applyStockRules([listed], day(75));
    expect(down.grade).toBe("C");
    expect(down.status).toBe("stripping");
  });

  it("never touches sold items or loose parts", () => {
    expect(applyStockRules([makeItem({ status: "sold" })], day(90))).toEqual([]);
    const part = makeItem({ category: "part", partType: "ram", grade: "C" });
    const [p] = applyStockRules([part], day(90));
    expect(p.grade).toBe("C");
    expect(p.status).toBe("listed");
  });
});

describe("hub alerts", () => {
  it("flags slow grading, a heavy scrap cage and waiting batteries", () => {
    const now = new Date("2026-11-20T10:00:00.000Z");
    const alerts = hubAlerts(
      [
        makeItem({
          id: "RL-JMU-0001",
          status: "received",
          grade: null,
          receivedAt: "2026-11-18T10:00:00.000Z",
        }),
        makeItem({ id: "RL-JMU-0002", status: "in_scrap_cage", grade: "D", weightKg: 60 }),
        makeItem({
          id: "RL-JMU-0003",
          status: "in_scrap_cage",
          grade: "D",
          weightKg: 45,
          hasBattery: false,
        }),
      ],
      [],
      now,
    );
    const text = alerts.map((a) => a.message).join(" | ");
    expect(text).toMatch(/not graded within 24 hours/);
    expect(text).toMatch(/105\.0 kg/);
    expect(text).toMatch(/batteries/);
  });
});

describe("dashboard", () => {
  it("computes items in, reuse share and stock age", () => {
    const now = new Date("2026-11-30T10:00:00.000Z");
    const items = [
      makeItem({
        id: "RL-JMU-0001",
        grade: "A",
        status: "sold",
        soldAt: "2026-11-10T00:00:00.000Z",
      }),
      makeItem({ id: "RL-JMU-0002", grade: "B", receivedAt: "2026-11-20T10:00:00.000Z" }),
      makeItem({ id: "RL-JMU-0003", grade: "D", status: "handed_over" }),
      makeItem({ id: "RL-JMU-0004", grade: "C", source: { type: "stripped" } }),
    ];
    const s = dashboardStats(
      items,
      [
        {
          id: "h",
          date: "2026-11-15",
          recycler: "x",
          kgByCategory: { monitor: 12 },
          batteryKg: 3,
          itemIds: [],
          receiptNo: "1",
          notes: "",
        },
      ],
      [],
      now,
    );
    const nov = s.months[0];
    expect(nov.itemsIn).toBe(3); // stripped part is not new intake
    expect(nov.reuseShare).toBeCloseTo(2 / 3);
    expect(nov.scrapKg).toBe(15);
    expect(nov.sold).toBe(1);
    expect(s.onRacks).toBe(2);
    expect(s.avgStockAgeDays).toBeCloseTo((29 + 10) / 2);
  });
});

describe("item rules", () => {
  it("ships only laptops and boards across India", () => {
    expect(shipsAcrossIndia({ category: "laptop" })).toBe(true);
    expect(shipsAcrossIndia({ category: "part", partType: "board" })).toBe(true);
    expect(shipsAcrossIndia({ category: "phone" })).toBe(false);
  });

  it("requires a data wipe for phones, computers and drives", () => {
    expect(needsDataWipe({ category: "phone" })).toBe(true);
    expect(needsDataWipe({ category: "part", partType: "storage" })).toBe(true);
    expect(needsDataWipe({ category: "monitor" })).toBe(false);
  });

  it("keeps the plan's numbers in one place", () => {
    expect(BUSINESS_RULES.consignment).toEqual({ thresholdPaise: 1_000_000, sellerShare: 0.7 });
    expect(BUSINESS_RULES.jammuDeliveryPaise).toBe(5_000);
    expect(BUSINESS_RULES.warrantyDays).toBe(30);
  });
});

import { describe, expect, it } from "vitest";
import { BUSINESS_RULES } from "@/config/business-rules";
import { formatItemId, isItemId, nextItemId, parseItemNumber } from "./ids";
import { needsDataWipe } from "./model";
import { cutPrice } from "./pricing";
import { applyStockRules, hubAlerts, stockRulesDue } from "./rules";
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

describe("price cut", () => {
  it("cuts a part price by 25%, rounded to ₹10 and never below ₹10", () => {
    expect(cutPrice(320_000)).toBe(240_000);
    expect(cutPrice(99_900)).toBe(75_000);
    expect(cutPrice(50_000)).toBe(38_000); // 37,500 rounds to ₹380
    expect(cutPrice(1_000)).toBe(1_000);
  });
});

describe("unsold-stock rules (parts day 30, devices day 45)", () => {
  const device = makeItem();
  const part = makeItem({
    id: "RL-JMU-0090",
    category: "part",
    partType: "board",
    grade: "C",
    currentPaise: 120_000,
    listPaise: 120_000,
  });

  it("does nothing before the thresholds", () => {
    expect(applyStockRules([device], day(44))).toEqual([]);
    expect(applyStockRules([part], day(29))).toEqual([]);
  });

  it("moves an A or B device to C and strips it on day 45, with no price cut", () => {
    const [down] = applyStockRules([device], day(45));
    expect(down.grade).toBe("C");
    expect(down.status).toBe("stripping");
    expect(down.currentPaise).toBe(device.currentPaise);
    expect(down.priceCutAt).toBeUndefined();
    expect(applyStockRules([down], day(90))).toEqual([]);
  });

  it("cuts a part 25% on day 30, once", () => {
    const [cut] = applyStockRules([part], day(30));
    expect(cut.currentPaise).toBe(90_000);
    expect(cut.priceCutAt).toBeDefined();
    expect(cut.status).toBe("listed");
    expect(cut.events.at(-1)?.type).toBe("auto_price_cut");
    expect(applyStockRules([cut], day(60))).toEqual([]);
  });

  it("never cuts a part a shop listed (the shop is reminded instead), a reserved or hidden item, or a sold one", () => {
    expect(applyStockRules([{ ...part, listedByPartnerId: "p1" }], day(40))).toEqual([]);
    expect(applyStockRules([makeItem({ status: "reserved" })], day(90))).toEqual([]);
    expect(applyStockRules([{ ...part, hidden: true }], day(40))).toEqual([]);
    expect(applyStockRules([makeItem({ status: "sold" })], day(90))).toEqual([]);
  });

  it("lists what the rules will reach within a week", () => {
    const due = stockRulesDue([device, part], day(40));
    expect(due.downgrade).toEqual([device.id]);
    expect(due.priceCut).toEqual([]);
    expect(stockRulesDue([device, part], day(25)).priceCut).toEqual([part.id]);
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
    expect(text).toMatch(/not tested within 24 hours/);
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
  it("requires a data wipe for phones, computers, drives and boards (except a monitor's)", () => {
    expect(needsDataWipe({ category: "phone" })).toBe(true);
    expect(needsDataWipe({ category: "part", partType: "storage" })).toBe(true);
    expect(needsDataWipe({ category: "part", partType: "board" })).toBe(true);
    expect(needsDataWipe({ category: "part", partType: "board", parentCategory: "monitor" })).toBe(
      false,
    );
    expect(needsDataWipe({ category: "monitor" })).toBe(false);
  });

  it("keeps the public rules in one place", () => {
    expect(BUSINESS_RULES.jammuDeliveryPaise).toBe(5_000);
    expect(BUSINESS_RULES.warrantyDays).toBe(30);
  });
});

describe("stock rules due soon (hub overview)", () => {
  const listed = (id: string, extra = {}) =>
    makeItem({
      id,
      status: "listed",
      grade: "A",
      listedAt: day(0).toISOString(),
      currentPaise: 100_000,
      ...extra,
    });

  it("lists devices reaching day 45 and parts reaching day 30 within a week", () => {
    const items = [
      listed("RL-JMU-0001"),
      listed("RL-JMU-0002", { category: "part", partType: "screen", grade: "C" }),
      listed("RL-JMU-0006", {
        category: "part",
        partType: "board",
        grade: "C",
        priceCutAt: day(30).toISOString(),
      }),
    ];
    expect(stockRulesDue(items, day(22))).toEqual({ priceCut: [], downgrade: [] });
    expect(stockRulesDue(items, day(23))).toEqual({ priceCut: ["RL-JMU-0002"], downgrade: [] });
    expect(stockRulesDue(items, day(30))).toEqual({ priceCut: [], downgrade: [] });
    expect(stockRulesDue(items, day(38))).toEqual({ priceCut: [], downgrade: ["RL-JMU-0001"] });
    expect(stockRulesDue(items, day(45))).toEqual({ priceCut: [], downgrade: [] });
  });

  it("ignores grade C devices, shop-listed parts and anything not listed", () => {
    const items = [
      listed("RL-JMU-0003", { grade: "C" }),
      listed("RL-JMU-0004", {
        grade: "C",
        category: "part",
        partType: "board",
        listedByPartnerId: "p1",
      }),
      makeItem({ id: "RL-JMU-0005", status: "sold", listedAt: day(0).toISOString() }),
    ];
    expect(stockRulesDue(items, day(70))).toEqual({ priceCut: [], downgrade: [] });
  });
});

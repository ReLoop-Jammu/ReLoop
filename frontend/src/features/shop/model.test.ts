import { describe, expect, it } from "vitest";
import snapshot from "@/data/shop-snapshot.json";
import { makeItem } from "@/features/inventory/test-helpers";
import { shopSnapshotSchema, toShopItem } from "./model";

describe("published stock file", () => {
  it("the committed file is valid", () => {
    expect(() => shopSnapshotSchema.parse(snapshot)).not.toThrow();
  });

  it("rejects duplicates and bad IDs", () => {
    const item = shopSnapshotSchema.parse(snapshot).items[0];
    expect(() =>
      shopSnapshotSchema.parse({ publishedAt: snapshot.publishedAt, items: [item, item] }),
    ).toThrow(/Duplicate/);
    expect(() =>
      shopSnapshotSchema.parse({
        publishedAt: snapshot.publishedAt,
        items: [{ ...item, id: "LAPTOP-1" }],
      }),
    ).toThrow();
  });
});

describe("toShopItem", () => {
  it("publishes only listed A/B/C items and never internal fields", () => {
    const listed = toShopItem(
      makeItem({ dataWipe: { required: true, doneAt: "2026-11-02T00:00:00.000Z" } }),
    );
    expect(listed).toMatchObject({
      id: "RL-JMU-0001",
      grade: "A",
      pricePaise: 320_000,
      dataWiped: true,
      warrantyDays: 30,
    });
    expect(JSON.stringify(listed)).not.toMatch(/buyPaise|source|events|expectedResale/);
    expect(toShopItem(makeItem({ status: "graded" }))).toBeNull();
    expect(toShopItem(makeItem({ grade: "D" }))).toBeNull();
  });

  it("shows the original price after a day-45 cut, and no warranty on parts", () => {
    const cut = toShopItem(
      makeItem({ priceCutAt: "2026-12-17T00:00:00.000Z", currentPaise: 256_000 }),
    );
    expect(cut).toMatchObject({ pricePaise: 256_000, wasPaise: 320_000 });
    const part = toShopItem(makeItem({ category: "part", partType: "ram", grade: "C" }));
    expect(part?.warrantyDays).toBeNull();
  });
});

describe("shop filters in the address", async () => {
  const { itemSaving, parseShopFilters, shopHref } = await import("./model");
  it("reads brand, price range, saving sort and page, ignoring nonsense", () => {
    expect(
      parseShopFilters({ brand: " Dell ", min: "1000", max: "5000", sort: "saving", page: "3" }),
    ).toEqual({
      q: undefined,
      grade: undefined,
      category: undefined,
      brand: "Dell",
      min: 1000,
      max: 5000,
      sort: "saving",
      page: 3,
    });
    expect(parseShopFilters({ min: "-5", max: "lots", page: "0", sort: "cheapest" })).toMatchObject(
      {
        min: undefined,
        max: undefined,
        page: undefined,
        sort: undefined,
      },
    );
  });

  it("builds shareable addresses, leaving out page 1", () => {
    expect(shopHref({ brand: "HP", min: 500, page: 1 })).toBe("/shop?brand=HP&min=500");
    expect(shopHref({ page: 2 })).toBe("/shop?page=2");
    expect(shopHref({})).toBe("/shop");
  });

  it("counts the bigger of the saving against new and the price cut", () => {
    expect(itemSaving({ pricePaise: 500000, newPricePaise: 1500000, wasPaise: 600000 })).toBe(
      1000000,
    );
    expect(itemSaving({ pricePaise: 500000, wasPaise: 600000 })).toBe(100000);
    expect(itemSaving({ pricePaise: 500000 })).toBe(0);
  });
});

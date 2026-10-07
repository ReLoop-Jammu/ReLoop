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

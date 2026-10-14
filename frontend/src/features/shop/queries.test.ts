import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { listingToShopItem } = await import("./queries");

const categories = [
  { id: 1, name: "Laptops" },
  { id: 5, name: "Monitors" },
];
const listing = (over: Partial<Parameters<typeof listingToShopItem>[0]>) => ({
  id: 1,
  title: "Sample – laptop",
  description: null,
  category_id: 1,
  brand: null,
  model: null,
  condition: "Used",
  price: 18000,
  stock: 1,
  image_url: null,
  status: "Active",
  featured: false,
  grade: "A" as const,
  created_at: "2026-10-09T00:00:00.000Z",
  is_sample: true,
  ...over,
});

describe("live listings in the shop", () => {
  it("only laptops (and boards) ship outside Jammu", () => {
    expect(listingToShopItem(listing({ category_id: 1 }), categories)?.shipsIndia).toBe(true);
    expect(listingToShopItem(listing({ category_id: 5 }), categories)?.shipsIndia).toBe(false);
  });

  it("carries the sample flag and the category", () => {
    const item = listingToShopItem(listing({ category_id: 5, is_sample: true }), categories);
    expect(item).toMatchObject({
      id: "RL-JMU-0001",
      category: "monitor",
      sample: true,
      pricePaise: 1800000,
    });
  });

  it("never shows grade D, inactive or out-of-stock listings", () => {
    expect(listingToShopItem(listing({ grade: "D" as never }), categories)).toBeNull();
    expect(listingToShopItem(listing({ status: "Sold" }), categories)).toBeNull();
    expect(listingToShopItem(listing({ stock: 0 }), categories)).toBeNull();
  });
});

const { hubItemToShopItem, combineStock } = await import("./queries");

describe("hub items in the shop", () => {
  const row = {
    id: "RL-JMU-0006",
    category: "laptop" as const,
    part_type: null,
    grade: "A" as const,
    brand: "Dell",
    model: "Latitude 5420",
    description: "Works, clean",
    checklist: { "Powers on": true, Keyboard: true, Battery: false },
    wiped_at: "2026-11-02T10:00:00.000Z",
    wipe_required: true,
    wipe_method: "reset_overwrite" as const,
    inspection: {
      version: 1,
      checks: { "Powers on": "pass", Keyboard: "pass", Battery: "fail" },
      battery_health_pct: 88,
    },
    inspected_at: "2026-11-02T09:00:00.000Z",
    list_paise: 2000000,
    current_paise: 1600000,
    price_cut_at: "2026-12-20T00:00:00.000Z",
    status: "listed" as const,
    listed_at: "2026-11-03T00:00:00.000Z",
    item_photos: [
      { position: 1, storage_path: "RL-JMU-0006/b.jpg" },
      { position: 0, storage_path: "RL-JMU-0006/a.jpg" },
    ],
  };

  it("shows a listed item with its first photo, passed checks, wipe and price cut", () => {
    expect(
      hubItemToShopItem(row, "https://x.supabase.co/storage/v1/object/public/item-photos"),
    ).toMatchObject({
      id: "RL-JMU-0006",
      title: "Dell Latitude 5420",
      pricePaise: 1600000,
      wasPaise: 2000000,
      photo: "https://x.supabase.co/storage/v1/object/public/item-photos/RL-JMU-0006/a.jpg",
      checks: ["Powers on", "Keyboard"],
      dataWiped: true,
      shipsIndia: true,
      warrantyDays: 30,
      report: {
        inspectedAt: "2026-11-02T09:00:00.000Z",
        checks: [
          { name: "Powers on", result: "pass" },
          { name: "Keyboard", result: "pass" },
          { name: "Battery", result: "fail" },
        ],
        batteryHealthPct: 88,
        wipeRequired: true,
        wipedAt: "2026-11-02T10:00:00.000Z",
        wipeMethod: "reset_overwrite",
      },
    });
  });

  it("drops anything not listed or not sellable", () => {
    expect(hubItemToShopItem({ ...row, status: "sold" }, "")).toBeNull();
    expect(hubItemToShopItem({ ...row, grade: "D" }, "")).toBeNull();
  });

  it("hides the samples as soon as real stock exists", () => {
    const sample = { ...hubItemToShopItem(row, "")!, id: "RL-JMU-0001", sample: true };
    const real = hubItemToShopItem(row, "")!;
    expect(combineStock([], [sample])).toEqual([sample]);
    expect(combineStock([real], [sample])).toEqual([real]);
  });

  it("keeps one item per ID: a listing with a hub item's tag is dropped", () => {
    const hub = hubItemToShopItem(row, "")!;
    const clash = { ...hub, title: "Old listing", sample: false };
    const other = { ...hub, id: "RL-JMU-0099", title: "Another listing", sample: false };
    const shown = combineStock([hub], [clash, other]);
    expect(shown.map((i) => i.title)).toEqual([hub.title, "Another listing"]);
    expect(new Set(shown.map((i) => i.id)).size).toBe(shown.length);
  });
});

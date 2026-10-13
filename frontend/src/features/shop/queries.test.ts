import { describe, expect, it } from "vitest";
import { rowToShopItem } from "./queries";

const BASE = "https://example.supabase.co";

const row = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "RL-JMU-0042",
    category: "laptop",
    part_type: null,
    grade: "A",
    brand: "Lenovo",
    model: "ThinkPad T480",
    description: "Core i5, 8 GB RAM.",
    checklist: { "Powers on": true, Display: true, Keyboard: false },
    wiped_at: "2026-11-02T09:00:00.000Z",
    list_paise: 1450000,
    current_paise: 1450000,
    price_cut_at: null,
    status: "listed",
    listed_at: "2026-11-03T10:00:00.000Z",
    item_photos: [],
    ...overrides,
  }) as Parameters<typeof rowToShopItem>[0];

describe("rowToShopItem", () => {
  it("builds a shop item from the item's own facts", () => {
    const item = rowToShopItem(row(), BASE);
    expect(item).toMatchObject({
      id: "RL-JMU-0042",
      title: "Lenovo ThinkPad T480",
      grade: "A",
      pricePaise: 1450000,
      dataWiped: true,
      warrantyDays: 30,
      shipsIndia: true,
      checks: ["Powers on", "Display"],
    });
    expect(item).not.toHaveProperty("sample");
  });

  it("does not claim India-wide shipping or warranty it hasn't got", () => {
    const phone = rowToShopItem(row({ category: "phone" }), BASE);
    expect(phone?.shipsIndia).toBe(false);

    const part = rowToShopItem(row({ category: "part", part_type: "screen", grade: "C" }), BASE);
    expect(part?.warrantyDays).toBeNull();
    expect(part?.shipsIndia).toBe(false);
  });

  it("marks wipe status honestly", () => {
    expect(rowToShopItem(row({ wiped_at: null }), BASE)?.dataWiped).toBe(false);
  });

  it("shows the old price after a price cut", () => {
    const item = rowToShopItem(
      row({ list_paise: 675000, current_paise: 540000, price_cut_at: "2026-12-18T00:00:00.000Z" }),
      BASE,
    );
    expect(item).toMatchObject({ pricePaise: 540000, wasPaise: 675000 });
  });

  it("links the first photo in public storage", () => {
    const item = rowToShopItem(
      row({
        item_photos: [
          { position: 1, storage_path: "RL-JMU-0042/1.jpg" },
          { position: 0, storage_path: "RL-JMU-0042/0.jpg" },
        ],
      }),
      BASE,
    );
    expect(item?.photo).toBe(`${BASE}/storage/v1/object/public/item-photos/RL-JMU-0042/0.jpg`);
  });

  it("never shows items that are not sellable", () => {
    expect(rowToShopItem(row({ status: "sold" }), BASE)).toBeNull();
    expect(rowToShopItem(row({ grade: "D" }), BASE)).toBeNull();
    expect(rowToShopItem(row({ grade: null }), BASE)).toBeNull();
    expect(rowToShopItem(row({ current_paise: null }), BASE)).toBeNull();
    expect(rowToShopItem(row({ listed_at: null }), BASE)).toBeNull();
    expect(rowToShopItem(row({ category: "toaster" }), BASE)).toBeNull();
  });
});

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

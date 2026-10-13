import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { mapPartnerShops, toPartnerShop } = await import("./partners");

describe("partner shops on the map", () => {
  it("shows the shop's name, market and position, marked approximate when it is", () => {
    expect(
      toPartnerShop({
        name: "Sharma Mobiles",
        market: "Raghunath Bazaar",
        lat: 32.73,
        lng: 74.86,
        approximate: true,
      }),
    ).toEqual({
      name: "Sharma Mobiles",
      market: "Raghunath Bazaar",
      lat: 32.73,
      lng: 74.86,
      approximate: true,
      description: "Position approximate.",
      agreedToBeShown: true,
    });
  });

  it("without Supabase (local dev, CI) the list is empty", async () => {
    expect(await mapPartnerShops()).toEqual([]);
  });
});

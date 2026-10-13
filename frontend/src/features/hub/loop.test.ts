import { describe, expect, it } from "vitest";
import { guessCategory } from "./loop";

describe("guessing a hub category from a shop's wording", () => {
  it("matches the submission form's categories", () => {
    expect(guessCategory("Category: Phones & tablets")).toEqual({
      category: "phone",
      partType: null,
    });
    expect(guessCategory("Category: Laptops")).toEqual({ category: "laptop", partType: null });
    expect(guessCategory("Category: Chargers & adapters")).toEqual({
      category: "part",
      partType: "charger",
    });
    expect(guessCategory("Accessories & parts")).toEqual({ category: "part", partType: "other" });
  });

  it("falls back to accessory", () => {
    expect(guessCategory("Something odd")).toEqual({ category: "accessory", partType: null });
  });
});

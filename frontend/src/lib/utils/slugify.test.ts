import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("creates readable URL slugs", () => {
    expect(slugify("HP Laptop — for repair")).toBe("hp-laptop-for-repair");
    expect(slugify("  DDR4 8GB Laptop RAM  ")).toBe("ddr4-8gb-laptop-ram");
  });

  it("strips accents and symbols", () => {
    expect(slugify("Café & Co. #1")).toBe("cafe-co-1");
  });
});

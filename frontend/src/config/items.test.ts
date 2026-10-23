import { describe, expect, it } from "vitest";
import { DEVICES, listOf, NOT_ACCEPTED, PARTS } from "./items";

describe("item lists", () => {
  it("names exactly what we buy, sell and refuse", () => {
    expect(DEVICES.map((d) => d.en)).toEqual([
      "Mobile phones",
      "Laptops",
      "Desktop computers",
      "Computer monitors",
    ]);
    expect(listOf(PARTS, "en")).toBe(
      "screens, lithium batteries, motherboards and phone boards, cameras, charging ports and keyboards",
    );
    expect(listOf(NOT_ACCEPTED, "en")).toBe(
      "TVs, printers, UPS units, small appliances and lead-acid batteries",
    );
  });

  it("joins Hindi lists with और and has a Hindi name for every item", () => {
    expect(listOf(NOT_ACCEPTED, "hi")).toMatch(/ और लेड-एसिड बैटरी$/);
    for (const i of [...DEVICES, ...PARTS, ...NOT_ACCEPTED]) expect(i.hi).toMatch(/\S/);
  });
});

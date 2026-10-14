import { describe, expect, it } from "vitest";
import { bandPosition, priceSteps, savingVsNew } from "./bands";

describe("public pricing", () => {
  it("places a price below, within or above its band", () => {
    expect(bandPosition(900, 1000, 2000)).toBe("below");
    expect(bandPosition(1000, 1000, 2000)).toBe("within");
    expect(bandPosition(2100, 1000, 2000)).toBe("above");
  });

  it("rounds the saving against new down to ₹50, and shows none without one", () => {
    expect(savingVsNew(600000, 1012345)).toBe(410000);
    expect(savingVsNew(600000, 590000)).toBeNull();
    expect(savingVsNew(600000, null)).toBeNull();
  });

  it("lists price changes in order without repeats", () => {
    expect(
      priceSteps([
        { at: "2026-10-03", price_paise: 480000 },
        { at: "2026-10-01", price_paise: 600000 },
        { at: "2026-10-02", price_paise: 600000 },
      ]).map((p) => p.price_paise),
    ).toEqual([600000, 480000]);
  });
});

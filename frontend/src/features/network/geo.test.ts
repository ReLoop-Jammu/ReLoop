import { describe, expect, it } from "vitest";
import { HUB_POSITION, VRRG_POSITION, lineWeight, marketPosition, projectPoints } from "./geo";

describe("network geometry", () => {
  it("finds route markets by name and nothing for merged groups", () => {
    expect(marketPosition("bahu plaza")).not.toBeNull();
    expect(marketPosition("Other Jammu markets")).toBeNull();
    expect(marketPosition("ReLoop hub")).toBeNull();
  });

  it("scales line weight between 2 and 10", () => {
    expect(lineWeight(0, 10)).toBe(2);
    expect(lineWeight(10, 10)).toBe(10);
    expect(lineWeight(5, 10)).toBe(6);
    expect(lineWeight(50, 10)).toBe(10);
    expect(lineWeight(5, 0)).toBe(2);
  });

  it("projects points inside the box with north at the top", () => {
    const pts = projectPoints([HUB_POSITION, VRRG_POSITION], 300, 200);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(300);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(200);
    }
    // The hub is north of Gangyal, so it is higher up the picture.
    expect(HUB_POSITION.lat).toBeGreaterThan(VRRG_POSITION.lat);
    expect(pts[0].y).toBeLessThan(pts[1].y);
  });
});

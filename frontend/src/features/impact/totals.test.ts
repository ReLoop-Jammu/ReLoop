import { describe, expect, it } from "vitest";
import { formatKg, parseImpactRow, showImpactNumbers } from "./totals";

describe("impact totals", () => {
  it("shows the pilot message until any total is above zero", () => {
    expect(showImpactNumbers(null)).toBe(false);
    expect(showImpactNumbers({ itemsReused: 0, kgRecycled: 0, activePartnerShops: 0 })).toBe(false);
    expect(showImpactNumbers({ itemsReused: 0, kgRecycled: 0.5, activePartnerShops: 0 })).toBe(
      true,
    );
    expect(showImpactNumbers({ itemsReused: 0, kgRecycled: 0, activePartnerShops: 1 })).toBe(true);
  });

  it("reads the view's row, including numbers PostgREST sends as strings", () => {
    expect(
      parseImpactRow({ items_reused: 3, kg_recycled: "47.8", active_partner_shops: "1" }),
    ).toEqual({
      itemsReused: 3,
      kgRecycled: 47.8,
      activePartnerShops: 1,
    });
    expect(parseImpactRow(undefined)).toBeNull();
    expect(
      parseImpactRow({ items_reused: "x", kg_recycled: 0, active_partner_shops: 0 }),
    ).toBeNull();
  });

  it("formats kilograms the Indian way", () => {
    expect(formatKg(47.8)).toBe("47.8");
    expect(formatKg(123456.4)).toBe("1,23,456");
  });
});

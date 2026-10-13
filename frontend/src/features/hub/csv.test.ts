import { describe, expect, it } from "vitest";
import { makeItem } from "@/features/inventory/test-helpers";
import { itemsCsv, kpiCsv, toCsv } from "./csv";

describe("CSV exports", () => {
  it("quotes cells and defuses spreadsheet formulas", () => {
    expect(toCsv([["a,b", 'say "hi"', "=SUM(A1)", null]])).toBe(
      '"a,b","say ""hi""",\'=SUM(A1),\r\n',
    );
  });

  it("never includes supplier contact names, phone numbers or a household seller's name", () => {
    const shopItem = makeItem({
      source: {
        type: "repair_shop",
        name: "Sharma Mobiles",
        contactName: "Ravi Sharma",
        phone: "9876543210",
      },
    });
    const household = makeItem({
      source: { type: "household", name: "Asha Verma", phone: "9123456780" },
    });
    const csv = itemsCsv([shopItem, household], [], []);
    expect(csv).toContain("Sharma Mobiles");
    for (const secret of ["Ravi Sharma", "9876543210", "Asha Verma", "9123456780"]) {
      expect(csv).not.toContain(secret);
    }
    expect(csv.split("\r\n")[0]).not.toMatch(/phone|contact/);
  });

  it("writes one row per month with the grade split and reuse share", () => {
    const csv = kpiCsv([
      {
        month: "2026-11",
        itemsIn: 10,
        graded: 8,
        gradeMix: { A: 2, B: 2, C: 2, D: 2 },
        reuseShare: 0.75,
        sold: 3,
        scrapKg: 12.5,
      },
    ]);
    expect(csv.split("\r\n")[1]).toBe("2026-11,10,8,2,2,2,2,75,3,12.5");
  });
});

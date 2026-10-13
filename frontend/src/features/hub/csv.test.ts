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
    expect(csv.split("\r\n")[1]).toBe("2026-11,10,8,2,2,2,2,75,3,12.5,0,0,0,0,0,0,0.00");
  });
});

describe("loop KPIs", () => {
  it("counts requests by kind and shop submissions through to purchase", async () => {
    const { loopStats } = await import("@/features/inventory/stats");
    const loop = loopStats(
      [
        { kind: "reservation", created_at: "2026-11-03T00:00:00Z" },
        { kind: "enquiry", created_at: "2026-11-04T00:00:00Z" },
        { kind: "institution_pickup", created_at: "2026-12-01T00:00:00Z" },
      ],
      [
        {
          status: "Purchased",
          created_at: "2026-11-01T00:00:00Z",
          reviewed_at: "2026-11-02T00:00:00Z",
          purchased_at: "2026-11-05T00:00:00Z",
          purchase_price: 900,
          offer_price: 450,
        },
      ],
    );
    expect(loop.map((l) => l.month)).toEqual(["2026-11", "2026-12"]);
    expect(loop[0]).toMatchObject({
      reservations: 1,
      enquiries: 1,
      submissionsIn: 1,
      submissionsOffered: 1,
      submissionsPurchased: 1,
      purchasedPaise: 90000,
    });
    expect(kpiCsv([], loop).split("\r\n")[1]).toBe("2026-11,0,0,0,0,0,0,,0,0.0,1,1,0,1,1,1,900.00");
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-client", () => ({ authenticatedFetch: vi.fn() }));

describe("reference price CSV", async () => {
  const { csvTemplate, parseReferenceCsv } = await import("./references");
  it("reads the template back as rows", () => {
    const { rows, errors } = parseReferenceCsv(csvTemplate());
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      category: "laptop",
      brand: "Dell",
      low_paise: 1200000,
      high_paise: 1700000,
    });
    expect(rows[2]).toMatchObject({ category: "part", part_type: "ram" });
  });

  it("says which lines can't be used and why", () => {
    const text = [
      "category,part_type,brand,model,low_inr,typical_inr,high_inr,source,checked_on",
      'laptop,,"Dell, Inc",X,"₹12,000",14000,13000,OLX,2026-11-01',
      "fridge,,,,1,2,3,OLX,2026-11-01",
      "part,,,,1,2,3,OLX,2026-11-01",
      "phone,,,,1,2,3,OLX,1 Nov",
    ].join("\n");
    expect(parseReferenceCsv(text).errors).toEqual([
      "Line 2: prices must be numbers with low ≤ typical ≤ high.",
      'Line 3: unknown category "fridge".',
      "Line 4: parts need a part type (and only parts).",
      "Line 5: checked_on must be a date like 2026-11-01.",
    ]);
    expect(parseReferenceCsv("a,b\n").errors[0]).toMatch(/first line must be/);
  });
});

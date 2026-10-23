import { describe, expect, it } from "vitest";
import {
  LEDGER_COLUMNS,
  activitySentence,
  isMonthSlug,
  monthSlug,
  monthTitle,
  rowsCsv,
  type LedgerRow,
} from "./model";

describe("transparency model", () => {
  it("writes the ledger CSV with the dictionary's columns", () => {
    const row: LedgerRow = {
      date: "2026-11-14",
      source: "Institution lot",
      institution: null,
      screens_kg: 0,
      boards_kg: 0,
      other_kg: "40.0",
      d_devices_kg: 0,
      batteries_kg: 0,
      before_bins_kg: 0,
      total_kg: "40.0",
      receipt_ref: null,
    };
    const csv = rowsCsv(LEDGER_COLUMNS, [row]);
    expect(csv.split(/\r?\n/)[0]).toBe(LEDGER_COLUMNS.map(([k]) => k).join(","));
    expect(csv).toContain("Institution lot");
  });

  it("reads and names months, and numbers them in the simulation", () => {
    expect(monthSlug("2026-11-01")).toBe("2026-11");
    expect(isMonthSlug("2026-11")).toBe(true);
    expect(isMonthSlug("2026-13")).toBe(false);
    expect(isMonthSlug("../x")).toBe(false);
    expect(monthTitle("2026-12", ["2026-11", "2026-12"], false)).toBe("December 2026");
    expect(monthTitle("2026-12", ["2026-12", "2026-11"], true)).toBe("Simulated month 2");
  });

  it("says what happened without naming anyone", () => {
    expect(
      activitySentence({
        day: "2026-11-10",
        kind: "weighin",
        category: "scrap",
        place: "Bahu Plaza",
        who: "Repair shops",
      }),
    ).toBe("Scrap weighed at a repair shop in Bahu Plaza");
    expect(
      activitySentence({ day: "x", kind: "sold", category: "part", place: null, who: null }),
    ).toBe("A used part (tested and working) found a new owner");
    expect(
      activitySentence({
        day: "x",
        kind: "institution_lot",
        category: "college",
        place: null,
        who: "Institutions",
      }),
    ).toBe("A lot was collected from a college");
  });
});

import { describe, expect, it } from "vitest";
import { journey, whereNow, type PassportRow } from "./stages";

const row = (stage: string, at: string): PassportRow => ({
  item_id: "RL-JMU-0042",
  category: "phone",
  part_type: null,
  stage,
  at,
});

describe("item passport", () => {
  it("orders the journey by date, and steps at the same moment in journey order", () => {
    const rows = [
      row("listed", "2026-10-03T10:00:00Z"),
      row("data_wiped", "2026-10-02T10:00:00Z"),
      row("inspected", "2026-10-02T10:00:00Z"),
      row("received", "2026-10-01T10:00:00Z"),
    ];
    expect(journey(rows).map((r) => r.stage)).toEqual([
      "received",
      "inspected",
      "data_wiped",
      "listed",
    ]);
    expect(whereNow(rows)).toBe("On sale");
  });

  it("says where the item ended up", () => {
    expect(whereNow([row("recycled", "2026-10-09T10:00:00Z")])).toBe("Handed to VRRG Group");
    expect(whereNow([row("sold", "2026-10-09T10:00:00Z")])).toBe("With its new owner");
    expect(whereNow([])).toBe("At the hub");
  });
});

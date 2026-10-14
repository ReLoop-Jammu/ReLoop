import { describe, expect, it } from "vitest";
import { bucketVisits } from "./link-visits";

const rows = [
  { day: "2026-10-05", slug: "drive", visits: 2 }, // a Monday
  { day: "2026-10-07", slug: "ig-bio", visits: 1 },
  { day: "2026-10-12", slug: "drive", visits: 4 }, // the next Monday
  { day: "2026-09-01", slug: "drive", visits: 9 }, // outside the range
];

describe("link visits by day and week", () => {
  it("fills every day in the range, including days without visits", () => {
    const days = bucketVisits(rows, 10, "day", "2026-10-14");
    expect(days).toHaveLength(10);
    expect(days[0]).toEqual({ start: "2026-10-05", total: 2, bySlug: { drive: 2 } });
    expect(days[1]).toEqual({ start: "2026-10-06", total: 0, bySlug: {} });
    expect(days.reduce((s, d) => s + d.total, 0)).toBe(7);
  });

  it("groups by week, starting on Monday", () => {
    const weeks = bucketVisits(rows, 14, "week", "2026-10-14");
    expect(weeks.map((w) => [w.start, w.total])).toEqual([
      ["2026-09-28", 0],
      ["2026-10-05", 3],
      ["2026-10-12", 4],
    ]);
    expect(weeks[1].bySlug).toEqual({ drive: 2, "ig-bio": 1 });
  });
});

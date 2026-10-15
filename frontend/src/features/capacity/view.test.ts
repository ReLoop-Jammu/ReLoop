import { describe, expect, it } from "vitest";
import type { Capacity } from "./api";
import { binViews, capacityAlerts, conditionLabel } from "./view";

const cap = (o: Partial<Capacity> = {}): Capacity => ({
  bins: [
    { bin: "screens", kg: "40", oldest: null, days_waiting: 3, near_limit: false, due: false },
    { bin: "boards", kg: 85, oldest: null, days_waiting: 5, near_limit: true, due: false },
    { bin: "other", kg: "120", oldest: null, days_waiting: 9, near_limit: true, due: true },
  ],
  battery: { kg: 2, count: 3, oldest: null, last_handover: null, reminder: false },
  device_rack: { slots: null, used: 12, pct: null, alert: null },
  parts_shelf: { count: 5 },
  ages: { devices: { d0_30: 1, d31_45: 2, d46_plus: 3 }, parts: { d0_30: 4, d31_plus: 1 } },
  ...o,
});

describe("capacity view", () => {
  it("scales bins to the 100 kg limit and marks alert and due", () => {
    expect(binViews(cap()).map((b) => [b.bin, b.fillPct, b.level])).toEqual([
      ["screens", 40, "ok"],
      ["boards", 85, "alert"],
      ["other", 100, "due"],
    ]);
  });

  it("raises alerts for bins, the battery week and full racks, and none for unset racks", () => {
    const quiet = capacityAlerts(cap());
    expect(quiet).toHaveLength(2);
    expect(quiet.join(" ")).not.toMatch(/rack/);
    const loud = capacityAlerts(
      cap({
        battery: { kg: 2, count: 3, oldest: null, last_handover: null, reminder: true },
        device_rack: { slots: 20, used: 17, pct: 85, alert: true },
      }),
    );
    expect(loud.some((a) => a.includes("battery"))).toBe(true);
    expect(loud.some((a) => a.includes("85% full (17 of 20 slots)"))).toBe(true);
  });

  it("names battery conditions", () => {
    expect(conditionLabel("swollen")).toBe("Swollen");
    expect(conditionLabel(null)).toBe("Not recorded");
  });
});

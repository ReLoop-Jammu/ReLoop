import { describe, expect, it } from "vitest";
import type { Item, Partner, RepairJob } from "@/features/inventory/model";
import { repairBoard } from "./repairs";

const now = new Date("2026-11-20T06:00:00Z");
const job = (o: Partial<RepairJob>): RepairJob => ({
  id: "j",
  itemId: "RL-JMU-0001",
  partnerId: "p1",
  fault: "No display",
  feePaise: 40_000,
  sentAt: "2026-11-15T06:00:00Z",
  ...o,
});
const items = [{ id: "RL-JMU-0001", brand: "Dell", model: "E2216", category: "monitor" }] as Item[];
const partners = [{ id: "p1", name: "Fix It" }] as Partner[];

describe("repairBoard", () => {
  it("lists open jobs longest-out first and flags those past 14 days", () => {
    const b = repairBoard(
      [
        job({ id: "new", sentAt: "2026-11-18T06:00:00Z" }),
        job({ id: "old", sentAt: "2026-11-01T06:00:00Z", feePaise: 25_000 }),
      ],
      items,
      partners,
      now,
    );
    expect(b.open.map((r) => r.id)).toEqual(["old", "new"]);
    expect(b.open[0]).toMatchObject({
      daysOut: 19,
      overdue: true,
      partnerName: "Fix It",
      itemName: "Dell E2216",
    });
    expect(b.open[1]).toMatchObject({ daysOut: 2, overdue: false });
    expect(b.totalFeePaise).toBe(65_000);
  });

  it("counts a closed job's days to the day it came back, newest first, at most ten", () => {
    const closed = Array.from({ length: 12 }, (_, i) =>
      job({
        id: `c${i}`,
        sentAt: "2026-11-01T06:00:00Z",
        returnedAt: `2026-11-${String(2 + i).padStart(2, "0")}T06:00:00Z`,
        outcome: i % 2 ? "fixed" : "not_fixable",
      }),
    );
    const b = repairBoard(closed, items, partners, now);
    expect(b.closed).toHaveLength(10);
    expect(b.closed[0]).toMatchObject({ id: "c11", daysOut: 12 });
    expect(b.closed.every((r) => !r.overdue)).toBe(true);
    expect(b.open).toEqual([]);
  });

  it("names a missing partner instead of failing", () => {
    expect(
      repairBoard([job({ partnerId: "gone" })], items, partners, now).open[0].partnerName,
    ).toBe("Unknown partner");
  });
});

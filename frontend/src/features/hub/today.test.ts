import { describe, expect, it } from "vitest";
import type { Item } from "@/features/inventory/model";
import type { BinStatus, Weighin } from "@/features/scrap/api";
import { istDay, todaySummary } from "./today";

const now = new Date("2026-11-10T08:00:00Z"); // 13:30 in India
const item = (o: Partial<Item>) => ({ id: "x", ...o }) as Item;
const w = (weighed_at: string, kg: number) =>
  ({
    weighed_at,
    screens_kg: kg,
    boards_kg: 0,
    batteries_kg: 0,
    other_kg: 0,
  }) as unknown as Weighin;
const bin = (b: string, kg: number, near = false, due = false) =>
  ({ bin: b, kg, near_limit: near, due }) as unknown as BinStatus;

describe("todaySummary", () => {
  it("counts today's items and weigh-ins by the Indian calendar day", () => {
    const s = todaySummary(
      [
        item({ receivedAt: "2026-11-10T01:00:00Z", listedAt: "2026-11-10T02:00:00Z" }),
        item({ receivedAt: "2026-11-09T18:00:00Z" }), // 23:30 IST on the 9th
        item({ receivedAt: "2026-11-09T19:00:00Z", soldAt: "2026-11-10T07:00:00Z" }), // 00:30 IST on the 10th
      ],
      [
        w("2026-11-10T04:00:00Z", 12.5),
        w("2026-11-10T05:00:00Z", 7.25),
        w("2026-11-09T04:00:00Z", 99),
      ],
      [bin("screens", 40), bin("boards", 85, true), bin("other", 120, true, true)],
      now,
    );
    expect(s).toMatchObject({ received: 2, listed: 1, sold: 1, weighins: 2, weighedKg: 19.8 });
    expect(s.bins.map((b) => b.fillPct)).toEqual([40, 85, 100]);
    expect(s.bins[2]).toMatchObject({ near: true, due: true });
  });

  it("is all zero on a quiet day", () => {
    expect(todaySummary([], [], [], now)).toEqual({
      received: 0,
      listed: 0,
      sold: 0,
      weighins: 0,
      weighedKg: 0,
      bins: [],
    });
  });

  it("names the day in India time", () => {
    expect(istDay("2026-11-09T19:00:00Z")).toBe("2026-11-10");
  });
});

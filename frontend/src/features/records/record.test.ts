import { describe, expect, it } from "vitest";
import { recordText, type HandoverRecord } from "./record";

const rec: HandoverRecord = {
  institution: "GGM Science College",
  lot_date: "2026-11-12",
  bought_items: [
    { tag: "RL-JMU-0007", category: "monitor", brand: "Dell", model: "E2216", grade: "B" },
    { tag: "RL-JMU-0008", category: "phone", brand: "", model: "", grade: null },
  ],
  dismantler: "VRRG Group",
  dismantler_receipt_no: "VRRG-77",
  dismantler_date: "2026-11-14",
  kg_by_category: { screens: 12, other: "30.5", batteries: 0 },
};

describe("recordText", () => {
  it("lists tags, the partner's receipt in the institution's name and the weights", () => {
    const t = recordText(rec);
    expect(t.bought).toEqual(["RL-JMU-0007: Dell E2216, grade B", "RL-JMU-0008: phone"]);
    expect(t.handedOver).toContain("VRRG-77");
    expect(t.handedOver).toContain("in the name of GGM Science College");
    expect(t.kg).toEqual(["Screens: 12.0 kg", "Everything else: 30.5 kg"]);
    expect(t.total).toBe("Total weighed: 42.5 kg");
  });

  it("says so when nothing has been handed over", () => {
    const t = recordText({
      ...rec,
      dismantler: null,
      dismantler_receipt_no: null,
      kg_by_category: {},
    });
    expect(t.handedOver).toBe(
      "The dead electronic waste from this lot has not been handed over yet.",
    );
    expect(t.total).toBe("");
  });

  it("never uses the words certificate or disposal, and shows no money", () => {
    const t = recordText(rec);
    const all = JSON.stringify(t);
    expect(all).not.toMatch(/certificat|dispos|₹|rs\.? ?\d/i);
  });
});

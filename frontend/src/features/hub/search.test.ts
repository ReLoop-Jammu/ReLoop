import { describe, expect, it } from "vitest";
import { makeItem } from "@/features/inventory/test-helpers";
import type { Institution, Partner } from "@/features/inventory/model";
import { searchHub } from "./search";

const partner = (name: string, market: string, owner = "Ravi Sharma"): Partner => ({
  id: name,
  type: "repair_shop",
  name,
  owner,
  phone: "9876543210",
  market,
  routeDay: "tue",
  isRepairPartner: false,
  status: "active",
  joinedAt: "2026-10-01",
  notes: "",
});
const data = {
  items: [
    makeItem({ id: "RL-JMU-0042", brand: "Samsung", model: "Galaxy M31" }),
    makeItem({ id: "RL-JMU-0420", brand: "Dell", model: "Latitude 5490" }),
  ],
  partners: [partner("Sharma Mobiles", "Raghunath Bazaar")],
  institutions: [{ id: "i1", name: "GGM Science College", type: "college" } as Institution],
};

describe("hub search", () => {
  it("finds an item by its full tag or just the number", () => {
    expect(searchHub("RL-JMU-0042", data).map((h) => h.id)).toEqual(["RL-JMU-0042"]);
    expect(searchHub("42", data).map((h) => h.id)).toEqual(["RL-JMU-0042"]);
    expect(searchHub("rl-jmu-420", data).map((h) => h.id)).toEqual(["RL-JMU-0420"]);
  });

  it("finds items by brand or model, and shops and institutions by name or market", () => {
    expect(searchHub("latitude", data).map((h) => h.href)).toEqual(["/hub/items/RL-JMU-0420"]);
    expect(searchHub("raghunath", data).map((h) => h.title)).toEqual(["Sharma Mobiles"]);
    expect(searchHub("science", data).map((h) => h.kind)).toEqual(["institution"]);
  });

  it("never searches contact names or phones, and ignores one-letter queries", () => {
    expect(searchHub("ravi", data)).toEqual([]);
    expect(searchHub("98765", data)).toEqual([]);
    expect(searchHub("s", data)).toEqual([]);
  });
});

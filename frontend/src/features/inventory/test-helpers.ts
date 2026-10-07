import type { Item } from "./model";

/** Builds a valid Item for tests; override only what the test cares about. */
export function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "RL-JMU-0001",
    receivedAt: "2026-11-01T10:00:00.000Z",
    source: { type: "repair_shop" },
    category: "phone",
    brand: "Samsung",
    model: "Galaxy M31",
    description: "",
    photos: [],
    hasBattery: true,
    grade: "A",
    checklist: {},
    faults: "",
    dataWipe: { required: true },
    rack: "",
    buyMode: "cash",
    buyPaise: 150_000,
    expectedResalePaise: 320_000,
    listPaise: 320_000,
    currentPaise: 320_000,
    status: "listed",
    listedAt: "2026-11-02T10:00:00.000Z",
    events: [],
    ...overrides,
  };
}

import { beforeEach, describe, expect, it } from "vitest";
import {
  addSubmission,
  createItem,
  exportAll,
  getItem,
  getItems,
  importAll,
  saveHandover,
  saveItem,
  setItemStatus,
  type NewItem,
} from ".";

const intake = (overrides: Partial<NewItem> = {}): NewItem => ({
  receivedAt: "2026-11-01T10:00:00.000Z",
  source: { type: "repair_shop", name: "Sharma Mobiles" },
  category: "monitor",
  brand: "Dell",
  model: "E2216H",
  description: "",
  photos: [],
  hasBattery: false,
  faults: "",
  dataWipe: { required: false },
  rack: "",
  buyMode: "cash",
  buyPaise: 100_000,
  expectedResalePaise: 280_000,
  ...overrides,
});

beforeEach(() => localStorage.clear());

describe("hub data layer (browser storage)", () => {
  it("assigns RL-JMU tags in order", async () => {
    const a = await createItem(intake());
    const b = await createItem(intake({ grade: "A" }));
    expect([a.id, b.id]).toEqual(["RL-JMU-0001", "RL-JMU-0002"]);
    expect(a.status).toBe("received");
    expect(b.status).toBe("graded");
  });

  it("applies the day-45 rule whenever items are read", async () => {
    const item = await createItem(intake({ grade: "A" }));
    await saveItem({
      ...item,
      status: "listed",
      listedAt: "2020-01-01T00:00:00.000Z",
      listPaise: 280_000,
      currentPaise: 280_000,
    });
    // 75+ days old: downgraded on read, without anything else being called.
    const [read] = await getItems();
    expect(read.grade).toBe("C");
    expect(read.status).toBe("stripping");
  });

  it("records the sale price and date when sold", async () => {
    const item = await createItem(intake({ grade: "A" }));
    await saveItem({
      ...item,
      status: "listed",
      listedAt: new Date().toISOString(),
      currentPaise: 250_000,
    });
    const sold = await setItemStatus(item.id, "sold");
    expect(sold.soldPaise).toBe(250_000);
    expect(sold.soldAt).toBeDefined();
  });

  it("a handover moves only the chosen items out of the scrap cage", async () => {
    const a = await createItem(intake({ grade: "D" }));
    const b = await createItem(intake({ grade: "D" }));
    await setItemStatus(a.id, "in_scrap_cage");
    await setItemStatus(b.id, "in_scrap_cage");
    await saveHandover({
      date: "2026-11-20",
      recycler: "Recycler",
      kgByCategory: { monitor: 9 },
      batteryKg: 0,
      itemIds: [a.id],
      receiptNo: "R-1",
      notes: "",
    });
    expect((await getItem(a.id))?.status).toBe("handed_over");
    expect((await getItem(b.id))?.status).toBe("in_scrap_cage");
  });

  it("never stores public form requests on the visitor's device", async () => {
    await addSubmission("household_dropoff", { name: "Asha", phone: "9876543210" });
    expect(JSON.stringify({ ...localStorage })).not.toContain("Asha");
  });

  it("round-trips a backup", async () => {
    await createItem(intake());
    const backup = await exportAll();
    localStorage.clear();
    expect(await getItems()).toHaveLength(0);
    await importAll(backup);
    expect((await getItems())[0].id).toBe("RL-JMU-0001");
    await expect(importAll({ nope: true } as never)).rejects.toThrow(/not a ReLoop backup/);
  });
});

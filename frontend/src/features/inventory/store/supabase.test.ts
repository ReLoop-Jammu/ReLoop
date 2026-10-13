import { describe, expect, it } from "vitest";
import { makeItem } from "../test-helpers";
import { itemToRow, rowToItem } from "./supabase";

describe("hub items in the shared database", () => {
  it("keeps every field through a save and load", () => {
    const item = makeItem({
      source: {
        type: "repair_shop",
        name: "Sharma Mobiles",
        contactName: "Ravi",
        phone: "98765 43210",
      },
      grade: "B",
      faults: "Cracked screen",
      buyPaise: 60000,
      purchasePaymentMethod: "upi",
      purchaseReference: "UPI-123",
      weightKg: 1.4,
      photos: [],
      events: [],
    });
    const { id, events, photos, ...fields } = item;
    const row = { id, ...itemToRow(fields), item_photos: [], item_events: [] };
    const back = rowToItem(row as never);
    expect({ ...back, events, photos }).toEqual(item);
  });

  it("never writes the tag or history (the database owns them)", () => {
    const { id: _id, events: _e, photos: _p, ...fields } = makeItem();
    void [_id, _e, _p];
    const row = itemToRow(fields);
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("created_by");
    expect(row).not.toHaveProperty("events");
  });
});

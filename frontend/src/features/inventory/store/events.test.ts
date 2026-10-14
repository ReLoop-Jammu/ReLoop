import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-client", () => ({ authenticatedFetch: vi.fn(), getSession: () => null }));

describe("saving an item's history", async () => {
  const { unsavedEvents } = await import("./supabase");
  const at = "2026-11-01T10:00:00Z";
  it("saves the client's own steps once, and leaves what the database logs to the database", () => {
    const saved = [
      { at, type: "received", note: "From repair shop" },
      { at, type: "note", note: "Screen has a dead pixel" },
    ];
    const local = [
      ...saved,
      { at, type: "data_wiped", note: "reset_overwrite" },
      { at, type: "graded" },
      { at, type: "price_changed", note: "₹6,000" },
      { at, type: "status:listed" },
      { at, type: "repair_sent", note: "To Sharma Mobiles" },
      { at, type: "note", note: "Screen has a dead pixel" },
    ];
    expect(unsavedEvents(saved, local)).toEqual([
      { at, type: "repair_sent", note: "To Sharma Mobiles" },
      { at, type: "note", note: "Screen has a dead pixel" },
    ]);
  });
});

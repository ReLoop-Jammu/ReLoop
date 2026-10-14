import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listClaims: vi.fn(),
  decideClaim: vi.fn(async () => null),
  logClaim: vi.fn(async () => "id"),
}));
vi.mock("@/features/warranty/api", async (orig) => ({ ...(await orig()), ...api }));
vi.mock("@/features/inventory/store", () => ({ SHARED_DATABASE: true }));
vi.mock("../badges", () => ({ refreshHubBadges: vi.fn() }));

const claim = (over = {}) => ({
  id: "c1",
  item_id: "RL-JMU-0042",
  buyer_id: "b1",
  opened_by: "buyer",
  contact_name: "",
  contact_phone: "",
  fault: "Screen flickers",
  status: "open",
  resolution: "",
  staff_note: "",
  created_at: "2026-10-10T05:00:00Z",
  closed_at: null,
  ...over,
});

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("hub warranty claims", () => {
  it("accepts a claim with a message for the buyer and a staff note", async () => {
    api.listClaims.mockResolvedValue([claim()]);
    const { WarrantyPage } = await import("./WarrantyPage");
    render(<WarrantyPage />);
    fireEvent.change(await screen.findByLabelText(/What to tell the buyer/), {
      target: { value: "Bring it to the hub" },
    });
    fireEvent.change(screen.getByLabelText("Staff note (staff only)"), {
      target: { value: "Check cable" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() =>
      expect(api.decideClaim).toHaveBeenCalledWith(
        "c1",
        "approved",
        "Bring it to the hub",
        "Check cable",
      ),
    );
  });

  it("logs a walk-in claim with the tag in capitals", async () => {
    api.listClaims.mockResolvedValue([]);
    const { WarrantyPage } = await import("./WarrantyPage");
    render(<WarrantyPage />);
    fireEvent.change(await screen.findByLabelText("Item tag"), {
      target: { value: "rl-jmu-0042" },
    });
    fireEvent.change(screen.getByLabelText("Buyer's name"), { target: { value: "Ravi" } });
    fireEvent.change(screen.getByLabelText("Buyer's phone"), { target: { value: "9000000001" } });
    fireEvent.change(screen.getByLabelText("What went wrong"), {
      target: { value: "Battery dead" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log the claim" }));
    await waitFor(() =>
      expect(api.logClaim).toHaveBeenCalledWith(
        "RL-JMU-0042",
        "Ravi",
        "9000000001",
        "Battery dead",
      ),
    );
  });
});

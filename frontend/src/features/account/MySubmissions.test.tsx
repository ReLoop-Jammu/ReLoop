import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  respondToOffer: vi.fn(async () => "2026-11-03"),
  myPickups: vi.fn(async () => [
    {
      shop_submission_id: 2,
      item_name: "Laptops",
      route_date: "2026-11-03",
      status: "scheduled",
      times_missed: 0,
    },
  ]),
  myPayouts: vi.fn(async () => [
    {
      receipt_no: "RL-PAY-2026-0001",
      shop_submission_id: 3,
      item_name: "Monitors",
      quantity: 2,
      amount_paise: 60000,
      method: "upi",
      paid_at: "2026-10-20",
    },
  ]),
  downloadReceipt: vi.fn(async () => {}),
}));
vi.mock("./api", () => api);
const sub = (id: number, status: string, item: string) => ({
  id,
  item_name: item,
  quantity: 2,
  condition: "Used",
  status,
  offer_price: 300,
  offer_note: "",
  rejection_reason: null,
  reviewed_at: null,
  created_at: "2026-10-10T05:00:00Z",
});
vi.mock("@/features/hub/loop", () => ({
  myShopSubmissions: vi.fn(async () => [
    sub(1, "Offered", "Phones"),
    sub(2, "Accepted", "Laptops"),
    sub(3, "Purchased", "Monitors"),
  ]),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("a shop owner's submissions", () => {
  it("accepts an offer in the app", async () => {
    const { MySubmissions } = await import("./MySubmissions");
    render(<MySubmissions />);
    fireEvent.click(await screen.findByRole("button", { name: "Accept the offer" }));
    await waitFor(() => expect(api.respondToOffer).toHaveBeenCalledWith(1, true, ""));
  });

  it("declines with an optional note", async () => {
    const { MySubmissions } = await import("./MySubmissions");
    render(<MySubmissions />);
    fireEvent.click(await screen.findByRole("button", { name: "Decline…" }));
    fireEvent.change(screen.getByLabelText(/Anything to tell ReLoop/), {
      target: { value: "Too low" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decline the offer" }));
    await waitFor(() => expect(api.respondToOffer).toHaveBeenCalledWith(1, false, "Too low"));
  });

  it("shows the pickup day and the payments, with a receipt to download", async () => {
    const { MySubmissions } = await import("./MySubmissions");
    render(<MySubmissions />);
    expect(await screen.findByText(/Tuesday, 3 November|Tuesday 3 November/)).toBeTruthy();
    expect(screen.getByText(/Payments from ReLoop/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Receipt \(PDF\) for RL-PAY-2026-0001/ }));
    expect(api.downloadReceipt).toHaveBeenCalledWith("RL-PAY-2026-0001");
  });
});

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HubRequest } from "../loop";

const loop = vi.hoisted(() => ({
  listRequests: vi.fn(),
  setRequestStatus: vi.fn(async () => {}),
  cancelRequest: vi.fn(async () => {}),
}));
vi.mock("../loop", () => loop);
vi.mock("@/features/inventory/store", () => ({ SHARED_DATABASE: true, setItemStatus: vi.fn() }));
vi.mock("@/lib/environment", () => ({ IS_SIMULATION: false }));

const row = (over: Partial<HubRequest>): HubRequest => ({
  id: "r1",
  kind: "institution_pickup",
  fields: { institution: "GGM College", contact: "Asha", phone: "9000000001" },
  status: "contacted",
  item_id: null,
  created_at: "2026-10-10T05:00:00Z",
  handled_at: null,
  from_account: true,
  scheduled_for: null,
  cancelled_by: null,
  cancel_reason: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

async function show(rows: HubRequest[]) {
  loop.listRequests.mockResolvedValue(rows);
  const { RequestsPage } = await import("./RequestsPage");
  render(<RequestsPage />);
  await screen.findAllByRole("listitem");
}

afterEach(cleanup);

describe("hub requests", () => {
  it("schedules a pickup on a date, and says when it came from an account", async () => {
    await show([row({})]);
    expect(screen.getByText(/Sent from a ReLoop account/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Pickup date"), { target: { value: "2026-11-03" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule pickup" }));
    await waitFor(() =>
      expect(loop.setRequestStatus).toHaveBeenCalledWith("r1", "scheduled", "2026-11-03"),
    );
  });

  it("cancels only with a reason, through cancel_request", async () => {
    await show([
      row({ kind: "reservation", item_id: "RL-JMU-0042", fields: { name: "Asha", phone: "9" } }),
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Cancel…" }));
    fireEvent.change(screen.getByLabelText("Reason (the person sees it)"), {
      target: { value: "Sold in the hub shop" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel the request" }));
    await waitFor(() =>
      expect(loop.cancelRequest).toHaveBeenCalledWith("r1", "Sold in the hub shop"),
    );
    expect(loop.setRequestStatus).not.toHaveBeenCalledWith("r1", "cancelled");
  });

  it("doesn't offer to reschedule a collected pickup, only to finish it", async () => {
    await show([row({ status: "collected" })]);
    const item = screen.getAllByRole("listitem")[0];
    expect(within(item).queryByLabelText("Pickup date")).toBeNull();
    fireEvent.click(within(item).getByRole("button", { name: "Pickup done" }));
    await waitFor(() => expect(loop.setRequestStatus).toHaveBeenCalledWith("r1", "done"));
  });

  it("shows who cancelled and why", async () => {
    loop.listRequests.mockResolvedValue([
      row({ status: "cancelled", cancelled_by: "staff", cancel_reason: "Too far for the route" }),
    ]);
    const { RequestsPage } = await import("./RequestsPage");
    render(<RequestsPage />);
    fireEvent.change(await screen.findByLabelText("Status"), { target: { value: "cancelled" } });
    expect(await screen.findByText(/Cancelled by ReLoop/)).toBeTruthy();
    expect(screen.getByText(/Too far for the route/)).toBeTruthy();
  });
});

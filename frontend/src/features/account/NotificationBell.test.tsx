import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const markRead = vi.fn(async () => {});
vi.mock("./notifications-store", () => ({
  markRead,
  useNotifications: () => [
    {
      id: 1,
      kind: "offer_made",
      title: "ReLoop made an offer for TV",
      body: "₹800.00 each",
      href: "/account",
      created_at: new Date().toISOString(),
      read_at: null,
    },
    {
      id: 2,
      kind: "shop_verified",
      title: "Your shop is verified",
      body: "",
      href: "/sell/shops",
      created_at: new Date().toISOString(),
      read_at: new Date().toISOString(),
    },
  ],
}));

afterEach(cleanup);

describe("notification bell", () => {
  it("says how many are unread, lists the latest and marks them read", async () => {
    const { NotificationBell } = await import("./NotificationBell");
    render(<NotificationBell />);
    const bell = screen.getByRole("button", { name: "Notifications: 1 unread" });
    fireEvent.click(bell);
    expect(screen.getByText("ReLoop made an offer for TV")).toBeTruthy();
    expect(screen.getByRole("link", { name: "See all notifications" }).getAttribute("href")).toBe(
      "/account/notifications",
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(markRead).toHaveBeenCalledWith();
    fireEvent.click(screen.getByText("ReLoop made an offer for TV"));
    expect(markRead).toHaveBeenCalledWith([1]);
  });
});

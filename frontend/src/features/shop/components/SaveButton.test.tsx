import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { whatsappShareUrl } from "./ShareButton";

const access = vi.hoisted(() => ({ current: { state: "signed-out" } as unknown }));
const api = vi.hoisted(() => ({
  isSaved: vi.fn(async () => false),
  saveItem: vi.fn(async () => null),
  unsaveItem: vi.fn(async () => null),
}));
vi.mock("@/lib/use-access", () => ({ useAccess: () => access.current }));
vi.mock("@/features/account/api", () => api);
vi.mock("next/navigation", () => ({ usePathname: () => "/shop/RL-JMU-0042" }));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("save button", () => {
  it("sends visitors to log in and back to the item", async () => {
    access.current = { state: "signed-out" };
    const { SaveButton } = await import("./SaveButton");
    render(<SaveButton itemId="RL-JMU-0042" />);
    expect(screen.getByRole("link", { name: /Save/ }).getAttribute("href")).toBe(
      "/login?from=%2Fshop%2FRL-JMU-0042",
    );
    expect(api.isSaved).not.toHaveBeenCalled();
  });

  it("doesn't send a signed-in person to log in when their account couldn't load", async () => {
    access.current = { state: "ready", access: null };
    const { SaveButton } = await import("./SaveButton");
    render(<SaveButton itemId="RL-JMU-0042" />);
    expect(screen.getByRole("status").textContent).toMatch(/Couldn't check your account/);
    expect(screen.queryByRole("link")).toBeNull();
    expect(api.isSaved).not.toHaveBeenCalled();
  });

  it("saves and unsaves for a signed-in person, and shows the database's message", async () => {
    access.current = { state: "ready", access: { role: "buyer" } };
    const { SaveButton } = await import("./SaveButton");
    render(<SaveButton itemId="RL-JMU-0042" />);
    const button = await screen.findByRole("button", { name: "Save", pressed: false });
    await vi.waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
    fireEvent.click(button);
    expect(await screen.findByRole("button", { name: "Saved", pressed: true })).toBeTruthy();
    expect(api.saveItem).toHaveBeenCalledWith("RL-JMU-0042");
    expect(screen.getByRole("link", { name: "Your saved items" }).getAttribute("href")).toBe(
      "/account/saved",
    );
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    expect(await screen.findByRole("button", { name: "Save", pressed: false })).toBeTruthy();
    expect(api.unsaveItem).toHaveBeenCalledWith("RL-JMU-0042");

    api.saveItem.mockRejectedValueOnce(new Error("This item is not on sale"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe("This item is not on sale");
  });
});

describe("share on WhatsApp", () => {
  it("lets the person choose who to send it to, never ReLoop's number", () => {
    const url = whatsappShareUrl("Dell Latitude 5490", 1450000, "https://example.test/shop/RL-1");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe(
      "Dell Latitude 5490, ₹14,500 at ReLoop Jammu: https://example.test/shop/RL-1",
    );
  });
});

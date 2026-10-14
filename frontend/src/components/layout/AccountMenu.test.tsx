import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccessState } from "@/lib/use-access";

let state: AccessState = { state: "signed-out" };
vi.mock("@/lib/use-access", async (orig) => ({
  ...(await orig<typeof import("@/lib/use-access")>()),
  useAccess: () => state,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));
const { AccountMenu } = await import("./AccountMenu");

const access = (over: object) => ({
  user_id: "u",
  name: "Asha Kumari",
  role: "buyer" as const,
  must_change_password: false,
  is_staff: false,
  is_admin: false,
  shop_status: null,
  ...over,
});

afterEach(cleanup);

describe("AccountMenu", () => {
  it("offers Log in when signed out", () => {
    state = { state: "signed-out" };
    render(<AccountMenu />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("shows an admin their role and the hub", () => {
    state = { state: "ready", access: access({ is_staff: true, is_admin: true, role: "admin" }) };
    render(<AccountMenu />);
    expect(screen.getByRole("link", { name: "Hub" })).toHaveAttribute("href", "/hub");
    fireEvent.click(screen.getByRole("button", { name: /Asha: account menu/ }));
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Staff hub" })).toHaveAttribute("href", "/hub");
  });

  it("labels hub staff and partner shops", () => {
    state = { state: "ready", access: access({ is_staff: true }) };
    const { unmount } = render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/ }));
    expect(screen.getByText("Hub staff")).toBeInTheDocument();
    unmount();
    state = { state: "ready", access: access({ role: "shop_owner", shop_status: "verified" }) };
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/ }));
    expect(screen.getByText("Partner shop")).toBeInTheDocument();
  });

  it("gives buyers no hub link", () => {
    state = { state: "ready", access: access({}) };
    render(<AccountMenu />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/ }));
    expect(screen.getByText("Buyer")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /hub/i })).toBeNull();
  });
});

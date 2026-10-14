import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: { fn: string; body: unknown }[] = [];
let queue: unknown[] = [];
vi.mock("@/lib/auth-client", () => ({
  authenticatedFetch: vi.fn(async (path: string, init: RequestInit) => {
    const fn = path.replace("/rest/v1/rpc/", "");
    calls.push({ fn, body: JSON.parse(String(init.body)) });
    return new Response(fn === "deletion_queue" ? JSON.stringify(queue) : "", { status: 200 });
  }),
}));
vi.mock("@/features/inventory/store", () => ({ SHARED_DATABASE: true }));
vi.mock("../badges", () => ({ refreshHubBadges: vi.fn() }));
vi.mock("./RequireRole", () => ({
  RequireRole: ({ children }: { children: ReactNode }) => children,
}));

const entry = (over = {}) => ({
  id: "d1",
  created_at: new Date().toISOString(),
  reason: "Closing the shop",
  full_name: "Asha Devi",
  role: "shop_owner",
  shop_name: "Asha Mobiles",
  is_team: false,
  purchased_lots: 2,
  requests: 1,
  ...over,
});

beforeEach(() => {
  calls.length = 0;
});

afterEach(cleanup);

describe("account deletions", () => {
  it("deletes only after a second confirmation", async () => {
    queue = [entry()];
    const { DeletionsPage } = await import("./DeletionsPage");
    render(<DeletionsPage />);
    expect(await screen.findByText("Asha Devi")).toBeTruthy();
    expect(screen.getByText(/30 days left|29 days left/)).toBeTruthy();
    expect(screen.getByText(/2 bought lot\(s\), 1 request\(s\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete the account…" }));
    expect(calls.some((c) => c.fn === "approve_account_deletion")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete the account" }));
    await waitFor(() =>
      expect(calls).toContainEqual({ fn: "approve_account_deletion", body: { p_request: "d1" } }),
    );
  });

  it("declines with a note, and can't delete a team member", async () => {
    queue = [entry({ is_team: true })];
    const { DeletionsPage } = await import("./DeletionsPage");
    render(<DeletionsPage />);
    expect(await screen.findByText(/Remove them from the team/)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Delete the account…" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Decline…" }));
    fireEvent.change(screen.getByLabelText("Why (they see this)"), {
      target: { value: "Open reservation first" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decline the request" }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        fn: "refuse_account_deletion",
        body: { p_request: "d1", p_note: "Open reservation first" },
      }),
    );
  });
});

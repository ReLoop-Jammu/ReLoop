import { describe, expect, it, vi } from "vitest";
import { HUB_TOOLS, isToolActive, toolsFor } from "./tools";

vi.mock("@/features/inventory/store", () => ({ SHARED_DATABASE: true }));
vi.mock("@/lib/auth-client", () => ({
  AUTH_EVENT: "x",
  authenticatedFetch: vi.fn(),
  getSession: () => null,
}));

describe("hub tools by role", () => {
  it("gives admins every tool, staff the staff ones, everyone else none", () => {
    expect(toolsFor({ is_staff: true, is_admin: true })).toHaveLength(HUB_TOOLS.length);
    const staff = toolsFor({ is_staff: true, is_admin: false }).map((t) => t.href);
    expect(staff).toContain("/hub/intake");
    expect(staff).not.toContain("/hub/users");
    expect(staff).not.toContain("/hub/audit");
    expect(toolsFor({ is_staff: false, is_admin: false })).toEqual([]);
    expect(toolsFor(null)).toEqual([]);
  });

  it("marks the overview active only on /hub itself", () => {
    expect(isToolActive("/hub", "/hub")).toBe(true);
    expect(isToolActive("/hub", "/hub/items")).toBe(false);
    expect(isToolActive("/hub/items", "/hub/items/RL-JMU-0001")).toBe(true);
    expect(isToolActive("/hub/items", "/hub/itemsx")).toBe(false);
  });
});

describe("badge counts", () => {
  it("adds a tool's counts together and hides zero", async () => {
    const { badgeCount } = await import("./tools");
    const b = {
      new_requests: 0,
      new_reservations: 0,
      new_institution_pickups: 0,
      new_questions: 0,
      new_submissions: 2,
      offers_waiting: 0,
      offers_accepted: 1,
      payouts_due: 0,
      pickups_next: 0,
      open_claims: 0,
      pickups_unconfirmed: 0,
      part_listings_waiting: 0,
      part_sales_to_pay: 0,
      bins_due: 0,
      pending_shops: null,
      deletion_requests: null,
    };
    expect(badgeCount({ badge: ["new_submissions", "offers_accepted"] }, b)).toBe(3);
    expect(badgeCount({ badge: "new_requests" }, b)).toBeNull();
    expect(badgeCount({ badge: "pending_shops" }, b)).toBeNull();
    expect(badgeCount({}, b)).toBeNull();
  });
});

describe("overview queues", async () => {
  const { queueTodos } = await import("./components/HubHome");
  it("lists only queues with something waiting, shops only for admins", () => {
    const base = {
      new_requests: 2,
      new_reservations: 1,
      new_institution_pickups: 0,
      new_questions: 1,
      new_submissions: 0,
      offers_waiting: 3,
      offers_accepted: 0,
      payouts_due: 0,
      pickups_next: 0,
      open_claims: 0,
      pickups_unconfirmed: 0,
      part_listings_waiting: 0,
      part_sales_to_pay: 0,
      bins_due: 0,
      pending_shops: null,
      deletion_requests: null,
    };
    expect(queueTodos(base).map((t) => [t.key, t.count])).toEqual([
      ["offers_waiting", 3],
      ["new_reservations", 1],
      ["new_questions", 1],
    ]);
    expect(queueTodos({ ...base, pending_shops: 2 })[0]).toMatchObject({
      key: "pending_shops",
      href: "/hub/shops",
      label: "shops waiting for verification",
    });
    expect(queueTodos(null)).toEqual([]);
  });
});

describe("overview stock to-dos", async () => {
  const { stockTodos } = await import("./components/HubHome");
  const { makeItem } = await import("@/features/inventory/test-helpers");
  it("lists a device 40 days on sale once, under the day-45 move to C", () => {
    const now = new Date("2026-12-11T10:00:00Z");
    const item = makeItem({
      id: "RL-JMU-0040",
      status: "listed",
      grade: "A",
      listedAt: new Date(now.getTime() - 40 * 86_400_000).toISOString(),
      currentPaise: 100_000,
    });
    const todos = stockTodos([item], [], now);
    expect(todos.filter((t) => t.ids?.includes("RL-JMU-0040")).map((t) => t.key)).toEqual([
      "downgrade",
    ]);
  });
});

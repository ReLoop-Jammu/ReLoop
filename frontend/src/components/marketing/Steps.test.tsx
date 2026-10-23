import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SHOP_STEPS } from "@/features/sell/steps";
import { Steps } from "./Steps";

afterEach(cleanup);

describe("Steps", () => {
  it("lists the six shop steps in order, as an ordered list", () => {
    render(<Steps steps={SHOP_STEPS} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(screen.getByRole("list").tagName).toBe("OL");
    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.querySelector('[data-l="en"]')?.textContent);
    expect(titles).toEqual([
      "Sign up",
      "We verify your shop",
      "Submit your items",
      "Get an offer (you can say no)",
      "Pickup on your route day",
      "Get paid",
    ]);
  });
});

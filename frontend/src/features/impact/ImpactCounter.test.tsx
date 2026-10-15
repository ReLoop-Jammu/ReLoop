import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ImpactCounter } from "./ImpactCounter";

afterEach(cleanup);

describe("ImpactCounter", () => {
  it("shows the pilot date when there are no totals", () => {
    render(<ImpactCounter totals={{ itemsReused: 0, kgRecycled: 0, activePartnerShops: 0 }} />);
    expect(screen.getByText("The Jammu pilot is running")).toBeTruthy();
    expect(screen.queryByText("devices and parts resold")).toBeNull();
  });

  it("shows the three totals once there are any", () => {
    render(<ImpactCounter totals={{ itemsReused: 12, kgRecycled: 47.8, activePartnerShops: 3 }} />);
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("47.8 kg")).toBeTruthy();
    expect(screen.getByText("partner shops")).toBeTruthy();
    expect(screen.queryByText(/pilot is running/)).toBeNull();
  });
});

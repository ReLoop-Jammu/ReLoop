import { describe, expect, it } from "vitest";
import { requestSteps, stageLabel, type RequestStage } from "./stages";

const base: RequestStage = {
  kind: "institution_pickup",
  status: "new",
  item_id: null,
  item_title: null,
  created_at: "2026-10-10T05:00:00Z",
  handled_at: null,
  scheduled_for: null,
  cancelled_by: null,
  cancel_reason: null,
};

describe("request stages", () => {
  it("shows a booking's steps, with the ones reached so far", () => {
    const steps = requestSteps({
      ...base,
      status: "scheduled",
      scheduled_for: "2026-11-03",
      handled_at: "2026-10-12T05:00:00Z",
    });
    expect(steps.map((s) => [s.key, s.reached])).toEqual([
      ["new", true],
      ["contacted", true],
      ["scheduled", true],
      ["collected", false],
      ["done", false],
    ]);
    expect(steps[0].when).toBe("10 Oct 2026");
    expect(steps[2]).toMatchObject({ when: "3 Nov 2026", detail: "Pickup on 3 Nov 2026" });
  });

  it("ends a cancelled request with who cancelled it and ReLoop's reason", () => {
    const steps = requestSteps({
      ...base,
      kind: "reservation",
      status: "cancelled",
      cancelled_by: "staff",
      cancel_reason: "Sold in the shop",
      handled_at: "2026-10-11T05:00:00Z",
    });
    expect(steps.map((s) => s.title)).toEqual(["Sent", "Cancelled by ReLoop"]);
    expect(steps[1].detail).toBe("Sold in the shop");
    expect(stageLabel({ kind: "reservation", status: "cancelled", cancelled_by: "buyer" })).toBe(
      "Cancelled by you",
    );
  });

  it("calls an answered question answered", () => {
    expect(requestSteps({ ...base, kind: "enquiry", status: "contacted" })[1].title).toBe(
      "Answered",
    );
    expect(stageLabel({ kind: "enquiry", status: "contacted", cancelled_by: null })).toBe(
      "Answered",
    );
  });
});

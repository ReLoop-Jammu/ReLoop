import { describe, expect, it } from "vitest";
import { gateState } from "@/lib/roles";
import { safeNext } from "@/lib/auth-client";
import { buildReview } from "./shop-reviews";

const NOW = new Date("2026-10-14T10:00:00.000Z");

describe("shop reviews", () => {
  it("verifying stamps the time and the admin", () => {
    expect(buildReview("verify", "  GSTIN checked  ", "admin-1", NOW)).toEqual({
      verification_status: "verified",
      verified_at: "2026-10-14T10:00:00.000Z",
      reviewed_by: "admin-1",
      review_notes: "GSTIN checked",
    });
  });

  it("rejecting needs a reason and clears verified_at", () => {
    expect(() => buildReview("reject", " ", "admin-1", NOW)).toThrow(/reason/);
    expect(buildReview("reject", "Fake GSTIN", "admin-1", NOW)).toMatchObject({
      verification_status: "rejected",
      verified_at: null,
      review_notes: "Fake GSTIN",
    });
  });
});

describe("role gate", () => {
  it("shows the right state", () => {
    expect(gateState({ signedIn: false, allowed: null, failed: false })).toBe("signed-out");
    expect(gateState({ signedIn: true, allowed: null, failed: false })).toBe("checking");
    expect(gateState({ signedIn: true, allowed: false, failed: false })).toBe("denied");
    expect(gateState({ signedIn: true, allowed: true, failed: false })).toBe("allowed");
    expect(gateState({ signedIn: true, allowed: null, failed: true })).toBe("error");
  });

  it("only returns to hub pages after login", () => {
    expect(safeNext("?next=%2Fhub%2Fshops")).toBe("/hub/shops");
    expect(safeNext("?next=/hub")).toBe("/hub");
    for (const bad of [
      "?next=https://evil.example",
      "?next=//evil.example",
      "?next=/hub/../x",
      "",
    ]) {
      expect(safeNext(bad)).toBe("/account");
    }
  });
});

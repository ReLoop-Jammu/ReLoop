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

  it("returns to the hub page after login, and never to another site", () => {
    expect(safeNext("?next=%2Fhub%2Fshops")).toBe("/hub/shops");
    expect(safeNext("?next=/hub")).toBe("/hub");
    // Dot segments are resolved, and the result stays on this site.
    expect(safeNext("?next=/hub/../x")).toBe("/x");
    for (const bad of ["?next=https://evil.example", "?next=//evil.example", ""]) {
      expect(safeNext(bad)).toBe("/account");
    }
  });
});

describe("putting a shop on the map", async () => {
  const { buildMapListing } = await import("./shop-reviews");
  it("needs a consent date and a position in Jammu", () => {
    expect(() =>
      buildMapListing({
        show: true,
        consentDate: "",
        market: "x",
        lat: 32.73,
        lng: 74.86,
        approximate: true,
      }),
    ).toThrow(/date the shop agreed/);
    expect(() =>
      buildMapListing({
        show: true,
        consentDate: "2026-10-13",
        market: "x",
        lat: 28.6,
        lng: 77.2,
        approximate: false,
      }),
    ).toThrow(/isn't in Jammu/);
    expect(
      buildMapListing({
        show: true,
        consentDate: "2026-10-13",
        market: "Raghunath Bazaar",
        lat: 32.7302,
        lng: 74.8641,
        approximate: true,
      }),
    ).toEqual({
      show_on_map: true,
      map_consent_at: "2026-10-13T00:00:00Z",
      map_market: "Raghunath Bazaar",
      map_lat: 32.7302,
      map_lng: 74.8641,
      map_approximate: true,
    });
  });

  it("taking a shop off the map needs nothing else", () => {
    expect(buildMapListing({ show: false })).toEqual({ show_on_map: false });
  });
});

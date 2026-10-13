import { describe, expect, it } from "vitest";
import { DRIVE_LINK, LOCATIONS, visiblePartnerShops } from "./locations";

// Roughly Jammu city and its outskirts, Gangyal included.
const inJammu = ({ lat, lng }: { lat: number; lng: number }) =>
  lat > 32.62 && lat < 32.8 && lng > 74.78 && lng < 74.95;

describe("locations data", () => {
  it("places everything in Jammu", () => {
    const { hub, route, recycler } = LOCATIONS;
    for (const p of [hub, recycler, ...route.stops, ...LOCATIONS.partnerShops]) {
      expect(inJammu(p), p.name).toBe(true);
    }
  });

  it("runs the route on Tuesday and Friday, in time order, from and back to the hub", () => {
    const { days, stops } = LOCATIONS.route;
    expect(days).toEqual(["Tuesday", "Friday"]);
    const times = stops.map((s) => s.time);
    expect(times.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))).toBe(true);
    expect([...times].sort()).toEqual(times);
    expect(stops[0].name).toBe(LOCATIONS.hub.name);
    expect(stops.at(-1)?.name).toBe(LOCATIONS.hub.name);
  });

  it("shows partner shops only once they agreed", () => {
    expect(visiblePartnerShops().every((s) => s.agreedToBeShown)).toBe(true);
  });

  it("keeps the printed QR link working", () => {
    expect(DRIVE_LINK.publicUrl).toBe(`https://re-loop-ochre.vercel.app${DRIVE_LINK.path}`);
    expect(DRIVE_LINK.destination.startsWith("/locations?")).toBe(true);
    // Same rule as the qr_scans.campaign check in the database.
    expect(DRIVE_LINK.campaign).toMatch(/^[a-z0-9-]{1,60}$/);
  });
});

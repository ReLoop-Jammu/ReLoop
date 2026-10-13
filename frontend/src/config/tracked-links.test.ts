import { describe, expect, it } from "vitest";
import { DRIVE_LINK } from "./locations";
import { PUBLIC_SITE, shortUrl, TRACKED_LINKS, trackedDestination } from "./tracked-links";

describe("tracked links", () => {
  it("have unique slugs that fit the database rules", () => {
    const slugs = TRACKED_LINKS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const l of TRACKED_LINKS) {
      // Same rule as link_visits.slug, .source and .medium.
      for (const v of [l.slug, l.source, l.medium, l.campaign])
        expect(v).toMatch(/^[a-z0-9-]{1,40}$/);
      expect(l.landing.startsWith("/")).toBe(true);
    }
  });

  it("tag Instagram and WhatsApp the way the plan says", () => {
    const by = (slug: string) => TRACKED_LINKS.find((l) => l.slug === slug)!;
    expect([by("ig-bio").source, by("ig-bio").medium]).toEqual(["instagram", "bio"]);
    expect(by("ig-post").medium).toBe("post");
    expect(by("ig-story").medium).toBe("story");
    expect(by("wa").source).toBe("whatsapp");
  });

  it("keep the printed QR code's destination", () => {
    const drive = TRACKED_LINKS.find((l) => l.slug === "drive")!;
    expect(trackedDestination(drive)).toBe(DRIVE_LINK.destination);
    expect(shortUrl(drive)).toBe(DRIVE_LINK.publicUrl);
    expect(PUBLIC_SITE).toBe("https://re-loop-ochre.vercel.app");
  });
});

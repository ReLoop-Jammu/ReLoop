import { describe, expect, it } from "vitest";
import { DRIVE_LINK } from "@/config/locations";
import { GET } from "./route";

const visit = (slug: string) =>
  GET(new Request(`https://re-loop-ochre.vercel.app/go/${slug}`), {
    params: Promise.resolve({ slug }),
  });

describe("/go/<slug>", () => {
  it("keeps the printed QR code working: /go/drive lands on the locations page, never cached", async () => {
    const response = await visit("drive");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://re-loop-ochre.vercel.app/locations?utm_source=qr&utm_medium=print&utm_campaign=awareness-drive-2026",
    );
    expect(response.headers.get("location")).toBe(
      `https://re-loop-ochre.vercel.app${DRIVE_LINK.destination}`,
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    ["ig-bio", "/?utm_source=instagram&utm_medium=bio&utm_campaign=reloop-pilot"],
    ["ig-post", "/shop?utm_source=instagram&utm_medium=post&utm_campaign=reloop-pilot"],
    ["ig-story", "/what-we-accept?utm_source=instagram&utm_medium=story&utm_campaign=reloop-pilot"],
    ["wa", "/?utm_source=whatsapp&utm_medium=share&utm_campaign=reloop-pilot"],
  ])("/go/%s lands on %s", async (slug, target) => {
    const response = await visit(slug);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`https://re-loop-ochre.vercel.app${target}`);
  });

  it("sends unknown links to the home page", async () => {
    const response = await visit("nope");
    expect(response.headers.get("location")).toBe("https://re-loop-ochre.vercel.app/");
  });
});

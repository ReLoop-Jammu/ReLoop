import { expect, test } from "@playwright/test";

test.describe("map & locations", () => {
  test("shows the hub in Gandhi Nagar, both routes, shops and the licensed recycler", async ({
    page,
  }) => {
    await page.goto("/locations");
    await expect(
      page.getByRole("heading", { level: 1, name: "Where ReLoop works in Jammu" }),
    ).toBeVisible();
    await expect(
      page.getByText("Gandhi Nagar, between Bahu Plaza and Gole Market").first(),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hub (buyer pickups)" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tuesday: Gandhi Nagar cluster" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Friday: Old city" })).toBeVisible();
    await expect(page.getByText("Bahu Plaza and Gole Market · From November 2026")).toBeVisible();
    const route = page.getByRole("region", { name: "Tuesday: Gandhi Nagar cluster" });
    await expect(route.getByRole("listitem")).toHaveCount(4);
    await expect(route.getByText("10:30")).toBeVisible();
    await expect(
      page.getByText("Partner shops on our route will be listed here as they join."),
    ).toBeVisible();
    await expect(
      page.getByText("We buy from shops, retailers and institutions only, not from homes."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "VRRG Group, Gangyal" })).toBeVisible();
  });

  test("the map loads", async ({ page }) => {
    await page.goto("/locations");
    const map = page.getByRole("region", { name: /Map of the ReLoop hub area/ });
    await expect(map).toBeVisible();
    await expect(map.locator(".leaflet-map-pane")).toHaveCount(1);
    await expect(map.getByRole("button", { name: "Zoom in" })).toBeVisible();
  });

  test("the drive link redirects to the locations page with the campaign", async ({ request }) => {
    const res = await request.get("/go/drive", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toMatch(
      /\/locations\?utm_source=qr&utm_medium=print&utm_campaign=awareness-drive-2026$/,
    );
  });

  test("the Instagram and WhatsApp short links land with their UTM tags", async ({ request }) => {
    for (const [slug, target] of [
      ["ig-bio", "/?utm_source=instagram&utm_medium=bio&utm_campaign=reloop-pilot"],
      ["ig-post", "/shop?utm_source=instagram&utm_medium=post&utm_campaign=reloop-pilot"],
      [
        "ig-story",
        "/what-we-accept?utm_source=instagram&utm_medium=story&utm_campaign=reloop-pilot",
      ],
      ["wa", "/?utm_source=whatsapp&utm_medium=share&utm_campaign=reloop-pilot"],
    ]) {
      const res = await request.get(`/go/${slug}`, { maxRedirects: 0 });
      expect(res.status(), slug).toBe(307);
      expect(
        new URL(res.headers()["location"]).pathname + new URL(res.headers()["location"]).search,
      ).toBe(target);
    }
  });

  test("the printable QR page shows the code and the link", async ({ page }) => {
    await page.goto("/locations/qr");
    await expect(
      page.getByRole("img", {
        name: /QR code linking to https:\/\/re-loop-ochre\.vercel\.app\/go\/drive/,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "PNG" })).toHaveAttribute(
      "href",
      "/qr/awareness-drive.png",
    );
  });

  test("the header, footer and contact page link to it", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('header a[href="/locations"]').first()).toBeAttached();
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Map & locations" }),
    ).toHaveAttribute("href", "/locations");
    await page.goto("/contact");
    await page.getByRole("link", { name: "See the map" }).click();
    await expect(page).toHaveURL(/\/locations$/);
  });
});

test.describe("printable outreach", () => {
  test("/print links the PDFs, and they download", async ({ page, request }) => {
    await page.goto("/print");
    for (const [name, file] of [
      ["Shopkeeper counter card (PDF)", "/print/counter-card.pdf"],
      ["Buyer and campus flyer (PDF)", "/print/awareness-flyer.pdf"],
      ["ReLoop Partner window badge (A5) (PDF)", "/print/partner-badge.pdf"],
    ]) {
      await expect(page.getByRole("link", { name })).toHaveAttribute("href", file);
      const res = await request.get(file);
      expect(res.status(), file).toBe(200);
      expect(res.headers()["content-type"]).toContain("application/pdf");
    }
  });

  test("the sheets show the QR code and WhatsApp number, and aren't indexed", async ({ page }) => {
    for (const path of ["/print/counter-card", "/print/awareness-flyer", "/print"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      if (path === "/print") continue;
      await expect(
        page.getByRole("img", {
          name: `QR code linking to https://re-loop-ochre.vercel.app/go/${path.endsWith("counter-card") ? "rate-card" : "drive"}`,
        }),
      ).toBeVisible();
      await expect(page.getByText("+91 98712 76179")).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Main" }), "no site header").toHaveCount(0);
    }
  });
});

import { expect, test } from "@playwright/test";

test.describe("map & locations", () => {
  test("shows the hub area, the Tuesday/Friday route, shops and the recycler", async ({ page }) => {
    await page.goto("/locations");
    await expect(
      page.getByRole("heading", { level: 1, name: "Where ReLoop works in Jammu" }),
    ).toBeVisible();
    await expect(
      page.getByText("Old-city market belt, between Raghunath Bazaar and Residency Road"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pickup route: every Tuesday and Friday" }),
    ).toBeVisible();
    await expect(page.getByText("Planned from November 2026")).toBeVisible();
    const route = page.getByRole("region", { name: "Pickup route: every Tuesday and Friday" });
    await expect(route.getByRole("listitem")).toHaveCount(5);
    await expect(route.getByText("10:30")).toBeVisible();
    await expect(
      page.getByText("Partner drop-off shops will be listed here as they join."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "VRG Groups, Gangyal" })).toBeVisible();
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

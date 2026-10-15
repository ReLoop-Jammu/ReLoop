import { expect, test } from "@playwright/test";

test.describe("Business Plan v2 pages", () => {
  test("the rate card lists every scrap category with a price per kilo", async ({ page }) => {
    await page.goto("/rate-card");
    await expect(
      page.getByRole("heading", { level: 1, name: "What we pay per kilo" }),
    ).toBeVisible();
    const table = page.getByRole("region", { name: "Rate card table" });
    for (const name of [/Screens/, /Batteries/, /boards/i, /Everything else|Other/])
      await expect(table.getByText(name).first()).toBeVisible();
  });

  test("a receipt link that does not exist shows no receipt", async ({ page }) => {
    const res = await page.goto("/receipt/not-a-real-token");
    expect([200, 404]).toContain(res?.status());
    await expect(page.getByText(/RL-PAY-\d{4}-\d{4}/)).toHaveCount(0);
  });

  test("receipt pages are kept out of search engines", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/receipt/);
  });

  for (const [path, text] of [
    ["/hub/weighins", "Weigh-ins are kept in the shared database."],
    ["/hub/exchange", "The Parts Exchange is kept in the shared database."],
    ["/hub/lots", "Institution lots are kept in the shared database."],
  ] as const) {
    test(`${path} says it needs the shared database when run without one`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(text)).toBeVisible();
    });
  }

  test("/account/parts asks visitors to log in", async ({ page }) => {
    await page.goto("/account/parts");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fparts$/);
  });

  test("the shop shows tested parts apart from devices", async ({ page }) => {
    await page.goto("/shop?kind=parts");
    await expect(page.locator("main article").first()).toBeVisible();
    await expect(page.locator("main article [data-part='tested']").first()).toBeVisible();
    await expect(page.locator("main article [data-grade]")).toHaveCount(0);
  });
});

test.describe("impact and network (no database: the pilot-starting state)", () => {
  test("the impact page frames Jammu and says the pilot is starting instead of inventing numbers", async ({
    page,
  }) => {
    await page.goto("/impact");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("kept in Jammu");
    await expect(page.getByRole("status")).toContainText("The pilot is starting");
    await expect(page.getByRole("heading", { name: "What we hold ourselves to" })).toBeVisible();
    await expect(page.getByText(/kitchen drawer|homes/i)).toHaveCount(0);
  });

  test("the network page explains its privacy rules and links the locations", async ({ page }) => {
    await page.goto("/network");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Where it comes from, where it goes",
    );
    await expect(page.getByText(/fewer than three active partner shops/)).toBeVisible();
    await expect(page.getByRole("status")).toContainText("The pilot is starting");
  });

  test("the home page sketches the loop and links to the network", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("img", { name: /A sketch of the loop/ })).toBeVisible();
    await page.getByRole("link", { name: "See the network" }).click();
    await expect(page).toHaveURL(/\/network$/);
  });
});

test.describe("partners", () => {
  test("the partner directory is linked from the sell menu and says shops are joining", async ({
    page,
  }) => {
    await page.goto("/partners");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Jammu shops in the ReLoop loop",
    );
    await expect(page.getByRole("status")).toContainText("Partner shops are joining");
    await expect(page.getByRole("link", { name: "Become a partner shop" })).toHaveAttribute(
      "href",
      "/sell/shops",
    );
  });

  test("the window badge reads Tested parts from ReLoop, with its QR code", async ({ page }) => {
    await page.goto("/print/partner-badge");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tested parts from ReLoop");
    await expect(
      page.getByRole("img", {
        name: "QR code linking to https://re-loop-ochre.vercel.app/go/partner-badge",
      }),
    ).toBeVisible();
    const res = await page.request.get("/go/partner-badge", { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.headers().location).toContain("/locations");
  });
});

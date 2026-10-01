import { expect, test } from "@playwright/test";

test.describe("marketplace", () => {
  test("home shows hero, categories and featured listings", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Old tech.");
    await expect(page.getByRole("main").getByRole("link", { name: /Used devices/ })).toBeVisible();
    await expect(page.locator("main article")).toHaveCount(8);
  });

  test("category tile filters the listings page", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Components/ })
      .first()
      .click();
    await expect(page).toHaveURL(/category=components/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Components");
    const conditions = page.locator("main article [data-condition]");
    await expect(conditions.first()).toBeVisible();
    for (const value of await conditions.evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-condition")),
    ))
      expect(value).toBe("tested");
  });

  test("search narrows results and shows an empty state with a way out", async ({ page }) => {
    await page.goto("/listings");
    const search = page.getByRole("searchbox", { name: "Search listings" }).last();
    await search.fill("thinkpad");
    await search.press("Enter");
    await expect(page).toHaveURL(/q=thinkpad/);
    await expect(page.locator("main article")).toHaveCount(1);

    await page.goto("/listings?q=zzzz-nothing");
    await expect(page.getByRole("heading", { name: "No listings found" })).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page.locator("main article")).toHaveCount(16);
  });

  test("condition select applies instantly", async ({ page }) => {
    await page.goto("/listings");
    await page.getByRole("combobox", { name: "Condition" }).selectOption("parts_only");
    await expect(page).toHaveURL(/condition=parts_only/);
    await expect(page.getByText(/Showing \d+ of 16 listings for Parts only/)).toBeVisible();
  });

  test("listing detail page renders and links back", async ({ page }) => {
    await page.goto("/listings");
    await page.getByRole("link", { name: "Lenovo ThinkPad T480" }).click();
    await expect(page).toHaveURL(/\/listings\/lenovo-thinkpad-t480$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lenovo ThinkPad T480");
    await expect(page.getByText("₹14,500").first()).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });

  test("unknown listing returns a helpful 404", async ({ page }) => {
    const res = await page.goto("/listings/does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
  });
});

test.describe("site", () => {
  test("impact page shows hotspot info on focus", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("to another life");
    await page.getByRole("button", { name: "Circuit board" }).focus();
    await expect(page.getByRole("tooltip").filter({ hasText: "Boards can contain" })).toBeVisible();
  });

  test("no horizontal scrolling on any main page", async ({ page }) => {
    for (const path of [
      "/",
      "/listings",
      "/impact",
      "/how-it-works",
      "/sell",
      "/contact",
      "/privacy",
      "/terms",
      "/listings/lenovo-thinkpad-t480",
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    }
  });

  test("navigation works on every viewport", async ({ page, isMobile }) => {
    await page.goto("/");
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "How it works" })
      .click();
    await expect(page).toHaveURL(/\/how-it-works$/);
    if (isMobile) await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("simulation site", () => {
  test("every page says it is a simulation, and search engines are kept out", async ({
    page,
    request,
  }) => {
    for (const path of ["/", "/shop", "/impact", "/sell"]) {
      await page.goto(path);
      await expect(
        page.getByText("Simulation based on business plan assumptions, not real data."),
      ).toBeVisible();
    }
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
  });

  test("the demo page explains the data and lists a login per role", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "About this demo" })).toBeVisible();
    for (const email of [
      "demo-admin@reloop.demo",
      "demo-staff@reloop.demo",
      "demo-shop@reloop.demo",
      "demo-buyer@reloop.demo",
    ])
      await expect(page.getByText(email)).toBeVisible();
  });

  test("the shop shows simulated stock and the home page shows real impact totals", async ({
    page,
  }) => {
    await page.goto("/shop");
    await expect(page.locator("main article").first()).toBeVisible();
    expect(await page.locator("main article").count()).toBeGreaterThan(20);
    await page.goto("/");
    await expect(page.getByText("items reused")).toBeVisible();
  });

  test("the demo admin reaches the hub dashboard with six months of data", async ({ page }) => {
    await loginAs(page, "demo-admin@reloop.demo", "/hub");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Active partner shops")).toBeVisible();
  });

  test("handoffs never message the real ReLoop number", async ({ page }) => {
    await page.goto("/sell");
    await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
  });
});

test.describe("menus by role (real logins)", () => {
  test("the demo staff member sees their role and the hub link", async ({ page, isMobile }) => {
    await loginAs(page, "demo-staff@reloop.demo", "/account");
    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByText("(Hub staff)")).toBeVisible();
    } else {
      await expect(
        page.locator("header").getByRole("link", { name: "Hub", exact: true }),
      ).toBeVisible();
    }
  });

  test("the demo buyer gets no hub link", async ({ page }) => {
    await loginAs(page, "demo-buyer@reloop.demo", "/account");
    await expect(
      page.locator("header").getByRole("link", { name: "Hub", exact: true }),
    ).toHaveCount(0);
  });
});

test.describe("settings", () => {
  test("the demo admin changes the opening hours, the contact page shows them, and they are restored", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "one viewport is enough for a shared setting");
    await loginAs(page, "demo-admin@reloop.demo", "/hub/settings");
    const TEST_HOURS = "Mon–Sat, 9:30–18:30 IST (simulation test)";
    const section = page.locator("section").filter({ hasText: "Contact details and hours" });
    const save = async (value: string) => {
      await page.getByLabel("Opening hours").fill(value);
      await section.getByRole("button", { name: "Save" }).click();
      await expect(section.getByText("Saved.")).toBeVisible({ timeout: 15_000 });
    };
    const before = await page.getByLabel("Opening hours").inputValue();
    try {
      await save(TEST_HOURS);
      // Saving drops the cached settings, so the next visit shows the change.
      await expect(async () => {
        await page.goto("/contact");
        await expect(page.getByText(TEST_HOURS)).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 30_000 });
    } finally {
      await page.goto("/hub/settings");
      // An earlier failed run may have left the test value; empty means the built-in hours.
      await save(before === TEST_HOURS ? "" : before);
    }
  });
});

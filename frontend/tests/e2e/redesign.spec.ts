import { expect, test } from "@playwright/test";

test.describe("redesigned core pages", () => {
  test("the home page shows the five steps every item goes through", async ({ page }) => {
    await page.goto("/");
    const strip = page.getByRole("region", {
      name: "What happens to every item before it is on sale",
    });
    for (const step of ["Bought", "Tested", "Wiped", "Graded", "Listed"])
      await expect(strip.getByText(step, { exact: false }).first()).toBeVisible();
  });

  test("an unknown page is a branded 404 that keeps the header and footer", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("an item that does not exist is a 404 with the header and footer too", async ({ page }) => {
    const res = await page.goto("/shop/RL-JMU-9999");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });
});

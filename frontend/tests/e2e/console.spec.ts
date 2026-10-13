import { expect, test, type Page } from "@playwright/test";
import { fillShopSubmission, mockShopSubmissions, signInAsShopOwner } from "./shop-owner";

/**
 * Opens every page and the main interactions, failing on any browser console
 * error or warning (including React hydration mismatches), uncaught exception
 * or failed same-site request. Keeps the site free of silent runtime bugs.
 */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning")
      problems.push(`console.${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`uncaught: ${err.message}`));
  page.on("requestfailed", (req) => {
    const url = new URL(req.url());
    // Ignore requests the test itself cancels by navigating away, and third-party beacons.
    if (url.hostname === "localhost" && req.failure()?.errorText !== "net::ERR_ABORTED") {
      problems.push(`request failed: ${req.url()} ${req.failure()?.errorText}`);
    }
  });
  page.on("response", (res) => {
    const url = new URL(res.url());
    if (url.hostname === "localhost" && res.status() >= 400) {
      problems.push(`HTTP ${res.status()}: ${res.url()}`);
    }
  });
  return problems;
}

const PAGES = [
  "/",
  "/shop",
  "/shop?grade=C&sort=price_asc",
  "/shop/RL-JMU-0001",
  "/shop/RL-JMU-0011",
  "/sell",
  "/sell/shops",
  "/sell/institutions",
  "/how-it-works",
  "/where-scrap-goes",
  "/warranty",
  "/impact",
  "/contact",
  "/privacy",
  "/terms",
  "/locations",
  "/locations/qr",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/resend-confirmation",
  "/hub",
  "/hub/intake",
  "/hub/items",
  "/hub/partners",
  "/hub/handovers",
  "/hub/data",
  "/hub/shops",
  "/hub/users",
  "/account/change-password",
  "/hub/items/RL-JMU-0042",
];

test("every page loads without console errors, hydration warnings or failed requests", async ({
  page,
}) => {
  const problems = watch(page);
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(problems).toEqual([]);
});

test("main interactions run without console errors", async ({ page }) => {
  const problems = watch(page);

  await signInAsShopOwner(page);
  await mockShopSubmissions(page);
  await page.goto("/sell/shops");
  await fillShopSubmission(page, ["Redmi 9 boards", "Dead chargers"]);
  await page.getByRole("button", { name: "Submit items to ReLoop" }).click();
  await expect(page.getByRole("status")).toContainText("Your items have been submitted");

  await page.goto("/shop/RL-JMU-0001");
  await page.goto("/shop");
  await page.getByRole("combobox", { name: "Sort by" }).selectOption("price_desc");
  await expect(page).toHaveURL(/sort=price_desc/);

  await page.goto("/hub/intake");
  await page.getByLabel("Seller name", { exact: true }).fill("Walk-in");
  await page.getByLabel("Brand").fill("Nokia");
  await page.getByLabel("Grade (if tested now)").selectOption("A");
  await page.getByLabel("We paid (₹)").fill("500");
  await page.getByRole("button", { name: "Save and assign tag" }).click();
  await page.getByRole("link", { name: "Open item" }).click();
  await page.getByRole("button", { name: "Mark wiped" }).click();
  await page.getByLabel("List price (₹)").fill("1200");
  await page.getByRole("button", { name: "List online" }).click();
  await page.goto("/hub");
  await page.goto("/hub/data");

  expect(problems).toEqual([]);
});

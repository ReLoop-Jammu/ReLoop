import { expect, test, type Page } from "@playwright/test";

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
  "/sell/home",
  "/sell/consignment",
  "/sell/list-yourself",
  "/how-it-works",
  "/where-scrap-goes",
  "/warranty",
  "/impact",
  "/contact",
  "/privacy",
  "/terms",
  "/hub",
  "/hub/intake",
  "/hub/items",
  "/hub/partners",
  "/hub/handovers",
  "/hub/data",
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

  await page.goto("/sell/home");
  await page.getByLabel("Roughly what do working used ones sell for? (optional)").fill("12000");
  await page.getByRole("button", { name: "Book a drop-off" }).click();
  await page.getByLabel("Your name").fill("Asha");
  await page.getByLabel("Phone / WhatsApp").fill("9876543210");
  await page.getByRole("button", { name: "Prepare my request" }).click();
  await expect(page.getByText("Almost done: send this to ReLoop")).toBeVisible();

  await page.goto("/shop/RL-JMU-0001");
  await page.goto("/shop");
  await page.getByRole("combobox", { name: "Sort by" }).selectOption("price_desc");
  await expect(page).toHaveURL(/sort=price_desc/);

  await page.goto("/hub/intake");
  await page.getByLabel("Name").fill("Walk-in");
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

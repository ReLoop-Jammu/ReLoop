import { expect, test } from "@playwright/test";

test.describe("public shop", () => {
  test("home explains the loop and shows graded stock", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Collect. Grade.");
    await expect(page.locator("main article")).toHaveCount(8);
    await expect(page.locator("main article [data-grade]").first()).toBeVisible();
  });

  test("grade chips filter the shop", async ({ page }) => {
    await page.goto("/shop");
    await page.getByRole("link", { name: /^B · Repaired/ }).click();
    await expect(page).toHaveURL(/grade=B/);
    const grades = await page
      .locator("main article [data-grade]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-grade")));
    expect(grades.length).toBeGreaterThan(0);
    expect(new Set(grades)).toEqual(new Set(["B"]));
  });

  test("search by item ID and the empty state", async ({ page }) => {
    await page.goto("/shop?q=RL-JMU-0008");
    await expect(page.locator("main article")).toHaveCount(1);
    await page.goto("/shop?q=zzzz-nothing");
    await expect(page.getByRole("heading", { name: "Nothing matches yet" })).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page.locator("main article")).toHaveCount(12);
  });

  test("item page shows ID, grade, warranty and delivery", async ({ page }) => {
    await page.goto("/shop/RL-JMU-0001");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lenovo ThinkPad T480");
    await expect(
      page.getByText("RL-JMU-0001", { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("30-day warranty").first()).toBeVisible();
    await expect(page.getByText("₹50 delivery")).toBeVisible();
    await expect(page.getByText(/ships across India/)).toBeVisible();
  });

  test("parts have no warranty and phones don't ship outside Jammu", async ({ page }) => {
    await page.goto("/shop/RL-JMU-0008");
    await expect(page.getByText(/day warranty/)).toHaveCount(0);
    await page.goto("/shop/RL-JMU-0002");
    await expect(page.getByText(/ships across India/)).toHaveCount(0);
  });

  test("old marketplace URLs redirect to the shop", async ({ page }) => {
    await page.goto("/listings/lenovo-thinkpad-t480");
    await expect(page).toHaveURL(/\/shop$/);
  });

  test("unknown item returns 404", async ({ page }) => {
    const res = await page.goto("/shop/RL-JMU-9999");
    expect(res?.status()).toBe(404);
  });
});

test.describe("sell to us", () => {
  test("estimator follows the plan's buy rules", async ({ page }) => {
    await page.goto("/sell/home");
    await page.getByLabel("Roughly what do working used ones sell for? (optional)").fill("8000");
    // Grade A at ₹8,000 resale: about 45% → ₹3,250 – ₹3,950.
    await expect(page.getByText("₹3,250 – ₹3,950")).toBeVisible();
    await page.getByText("One problem").click();
    // Grade B: about 25% → ₹1,800 – ₹2,200.
    await expect(page.getByText("₹1,800 – ₹2,200")).toBeVisible();
    await page.getByText("Several problems").click();
    await expect(page.getByText("₹100 – ₹200")).toBeVisible();
  });

  test("estimator offers consignment above ₹10,000", async ({ page }) => {
    await page.goto("/sell/home");
    await page.getByLabel("Roughly what do working used ones sell for? (optional)").fill("40000");
    await expect(page.getByText(/consignment/)).toBeVisible();
    await expect(page.getByText(/about ₹28,000/)).toBeVisible();
  });

  test("partner sign-up validates, then prepares the request", async ({ page }) => {
    await page.goto("/sell/shops");
    await page.getByRole("button", { name: "Prepare my sign-up" }).click();
    await expect(page.getByText("Please fill in shop name.")).toBeVisible();
    await page.getByLabel("Shop name").fill("Sharma Mobiles");
    await page.getByLabel("Type of shop").selectOption("Repair shop");
    await page.getByLabel("Your name").fill("Ravi Sharma");
    await page.getByLabel("Phone / WhatsApp").fill("12");
    await page.getByLabel("Market").selectOption("Raghunath Bazaar");
    await page.getByRole("button", { name: "Prepare my sign-up" }).click();
    await expect(page.getByText("Enter a phone number with at least 10 digits.")).toBeVisible();
    await page.getByLabel("Phone / WhatsApp").fill("98765 43210");
    await page.getByRole("button", { name: "Prepare my sign-up" }).click();
    await expect(page.getByText("Almost done: send this to ReLoop")).toBeVisible();
    await expect(page.getByText("Shop name: Sharma Mobiles")).toBeVisible();
  });

  test("every sell path is reachable from /sell", async ({ page }) => {
    await page.goto("/sell");
    for (const name of ["Become a partner shop", "Book a pickup", "Get an estimate"]) {
      await expect(
        page.getByRole("main").getByRole("link", { name: new RegExp(name) }),
      ).toBeVisible();
    }
    await expect(page.getByRole("main").getByRole("link", { name: /Consignment/ })).toBeVisible();
  });
});

test.describe("site", () => {
  test("no horizontal scrolling on any page", async ({ page }) => {
    for (const path of [
      "/",
      "/shop",
      "/shop/RL-JMU-0001",
      "/sell",
      "/sell/home",
      "/sell/shops",
      "/sell/institutions",
      "/how-it-works",
      "/where-scrap-goes",
      "/warranty",
      "/impact",
      "/contact",
      "/hub",
      "/hub/intake",
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
      .getByRole("link", { name: "Sell to us" })
      .click();
    await expect(page).toHaveURL(/\/sell$/);
  });

  test("public pages never make claims the business plan doesn't support", async ({ page }) => {
    const banned = [
      /buyers across india/i,
      /nationwide/i,
      /publish(es)? instantly/i,
      /verified partners/i,
      /we are (an )?authori[sz]ed/i,
      /certified/i,
      /₹73/,
      /margin/i,
      /break-?even/i,
    ];
    for (const path of [
      "/",
      "/shop",
      "/sell",
      "/sell/shops",
      "/sell/institutions",
      "/sell/home",
      "/sell/consignment",
      "/how-it-works",
      "/where-scrap-goes",
      "/warranty",
      "/impact",
      "/contact",
      "/privacy",
      "/terms",
    ]) {
      await page.goto(path);
      const text = await page.locator("body").innerText();
      for (const re of banned) expect(text, `${re} found on ${path}`).not.toMatch(re);
    }
  });
});

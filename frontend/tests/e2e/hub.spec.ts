import { expect, test } from "@playwright/test";

test.describe("hub (staff tool)", () => {
  test("is hidden from search engines", async ({ page }) => {
    await page.goto("/hub");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("intake → grade → wipe → list → publish snapshot", async ({ page }) => {
    await page.goto("/hub/partners");
    await page.getByLabel("Shop name").fill("Sharma Mobiles");
    await page.getByLabel("Phone").first().fill("9876543210");
    await page.getByRole("button", { name: "Add shop" }).click();
    await expect(page.getByRole("cell", { name: /Sharma Mobiles/ })).toBeVisible();

    await page.goto("/hub/intake");
    await page
      .getByLabel("Partner shop")
      .selectOption({ label: "Sharma Mobiles (Raghunath Bazaar)" });
    await page.getByLabel("Brand").fill("Samsung");
    await page.getByLabel("Model").fill("Galaxy M31");
    await page.getByLabel("Expected resale (₹)").fill("6000");
    await page.getByLabel("Grade (if tested now)").selectOption("A");
    await expect(page.getByText("₹2,450 – ₹2,950")).toBeVisible();
    await page.getByLabel("We paid (₹)").fill("2700");
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await expect(page.getByText("RL-JMU-0001", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Open item" }).click();
    await expect(page).toHaveURL(/\/hub\/items\/RL-JMU-0001$/);
    await expect(page.getByText("Record the data wipe before listing.")).toBeVisible();
    await page.getByRole("button", { name: "Mark wiped" }).click();
    await page.getByRole("button", { name: "List online" }).click();
    await expect(page.getByText(/Listed at ₹6,000/).first()).toBeVisible();

    await page.goto("/hub");
    await expect(page.getByText("Items in this month")).toBeVisible();

    await page.goto("/hub/data");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download shop file" }).click();
    const file = await download;
    const snapshot = JSON.parse(
      await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()),
    );
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]).toMatchObject({
      id: "RL-JMU-0001",
      grade: "A",
      pricePaise: 600000,
      dataWiped: true,
      warrantyDays: 30,
    });
    expect(JSON.stringify(snapshot)).not.toMatch(/buyPaise|Sharma/);
  });

  test("grade D goes to the scrap cage and out with a handover", async ({ page }) => {
    await page.goto("/hub/intake");
    await page.getByLabel("Source").selectOption("household");
    await page.getByLabel("Category").selectOption("monitor");
    await page.getByLabel("Brand").fill("Old CRT");
    await page.getByLabel("Grade (if tested now)").selectOption("D");
    await page.getByLabel("How we bought it").selectOption("free");
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await page.getByRole("link", { name: "Open item" }).click();
    await page.getByLabel("Weight (kg)").fill("14");
    await page.getByRole("button", { name: "Move to scrap cage" }).click();

    await page.goto("/hub/handovers");
    await expect(page.getByText(/1 items, 14.0 kg/)).toBeVisible();
    await page.getByLabel("Recycler").fill("Authorised recycler");
    await page.getByLabel("Receipt number").fill("R-001");
    await page.getByLabel("Total weight on receipt (kg)").fill("14");
    await page.getByRole("button", { name: /Save handover/ }).click();
    await expect(page.getByRole("cell", { name: "R-001" })).toBeVisible();
    await expect(page.getByText("The cage is empty.")).toBeVisible();
  });
});

test.describe("hub item lifecycle", () => {
  test("a C device is stripped into tagged parts and stays grade C", async ({ page }) => {
    await page.goto("/hub/intake");
    await page.getByLabel("Category").selectOption("laptop");
    await page.getByLabel("Seller name", { exact: true }).fill("Walk-in shop");
    await page.getByLabel("Brand").fill("Acer");
    await page.getByLabel("Grade (if tested now)").selectOption("C");
    await page.getByLabel("We paid (₹)").fill("150");
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await page.getByRole("link", { name: "Open item" }).click();
    await page.getByRole("button", { name: "Add part" }).click();
    await page.getByLabel("Part type").selectOption("ram");
    await page.getByLabel("Part description").fill("8 GB DDR4");
    await page.getByLabel("Price (₹)").fill("900");
    await page.getByRole("button", { name: "Save parts, shell to scrap" }).click();
    await expect(page.getByText("Parts tagged. Shell moved to the scrap cage.")).toBeVisible();
    await expect(page.locator("[data-grade]").first()).toHaveAttribute("data-grade", "C");

    await page.goto("/hub/items");
    await expect(page.getByRole("cell", { name: /8 GB DDR4/ })).toBeVisible();
  });

  test("switching the source clears a previously chosen shop", async ({ page }) => {
    await page.goto("/hub/partners");
    await page.getByLabel("Shop name").fill("Gupta Electronics");
    await page.getByLabel("Phone").first().fill("9876500000");
    await page.getByRole("button", { name: "Add shop" }).click();
    await page.goto("/hub/intake");
    await page
      .getByLabel("Partner shop")
      .selectOption({ label: "Gupta Electronics (Raghunath Bazaar)" });
    await page.getByLabel("Source").selectOption("household");
    await page.getByLabel("Source").selectOption("repair_shop");
    await expect(page.getByLabel("Partner shop")).toHaveValue("");
  });
});

test.describe("shop verification (admin only)", () => {
  test("asks visitors to log in and shows no shop data", async ({ page }) => {
    await page.goto("/hub/shops");
    await expect(page.getByRole("heading", { name: "Log in to continue" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?next=%2Fhub%2Fshops",
    );
    await expect(page.getByRole("heading", { name: "Shop verification" })).toHaveCount(0);
  });
});

test.describe("KPI dashboard exports", () => {
  test("the items CSV leaves out supplier contact names and phone numbers", async ({ page }) => {
    await page.goto("/hub/intake");
    await page.getByLabel("Seller name", { exact: true }).fill("Sharma Mobiles");
    await page.getByLabel("Supplier contact name").fill("Ravi Sharma");
    await page.getByLabel("Supplier phone / WhatsApp").fill("98765 43210");
    await page.getByLabel("Brand").fill("Nokia");
    await page.getByLabel("Grade (if tested now)").selectOption("A");
    await page.getByLabel("We paid (₹)").fill("500");
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await expect(page.getByRole("link", { name: "Open item" })).toBeVisible();

    await page.goto("/hub");
    await expect(page.getByText(/Grade A: 1/)).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Items (CSV)" }).click();
    const file = await (await download).path();
    const csv = (await import("node:fs")).readFileSync(file, "utf8");
    expect(csv).toContain("Sharma Mobiles");
    expect(csv).toContain("Nokia");
    expect(csv).not.toContain("Ravi Sharma");
    expect(csv).not.toMatch(/98765\s?43210/);

    const kpis = page.waitForEvent("download");
    await page.getByRole("button", { name: "KPIs (CSV)" }).click();
    const kpiCsv = (await import("node:fs")).readFileSync(await (await kpis).path(), "utf8");
    expect(kpiCsv.split("\r\n")[0]).toBe(
      "month,items_in,graded,grade_a,grade_b,grade_c,grade_d,reuse_pct,sold,scrap_kg,reservations,enquiries,institution_pickups,shop_submissions_in,shop_submissions_offered,shop_submissions_purchased,purchased_inr",
    );
  });
});

test.describe("user admin", () => {
  test("/hub/users asks visitors to log in and shows no accounts", async ({ page }) => {
    await page.goto("/hub/users");
    await expect(page.getByRole("heading", { name: "Log in to continue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset password" })).toHaveCount(0);
  });
});

test.describe("the loop in the hub (device mode)", () => {
  for (const [path, heading] of [
    ["/hub/requests", "Requests"],
    ["/hub/submissions", "Shop submissions"],
  ] as const) {
    test(`${path} explains it needs the shared database`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText(/kept in the shared database/)).toBeVisible();
    });
  }
});

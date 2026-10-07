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

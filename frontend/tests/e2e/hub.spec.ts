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
    await page.getByLabel(/Ownership/).check();
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await expect(page.getByText("RL-JMU-0001", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Open item" }).click();
    await expect(page).toHaveURL(/\/hub\/items\/RL-JMU-0001$/);
    await expect(page.getByText("Record the data wipe before listing.")).toBeVisible();
    await page.getByRole("button", { name: "Mark wiped" }).click();
    await page.getByRole("button", { name: "List online" }).click();
    await expect(page.getByText(/Listed at ₹6,000/).first()).toBeVisible();

    await page.goto("/hub/kpis");
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

  test("grade D goes to the D devices bin and out with a handover", async ({ page }) => {
    await page.goto("/hub/intake");
    await page.getByLabel("Source").selectOption("repair_shop");
    await page.getByLabel("Category").selectOption("monitor");
    await page.getByLabel("Brand").fill("Old CRT");
    await page.getByLabel("Grade (if tested now)").selectOption("D");
    await page.getByLabel("How we bought it").selectOption("free");
    await page.getByLabel(/Ownership/).check();
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await page.getByRole("link", { name: "Open item" }).click();
    await page.getByLabel("Weight (kg)").fill("14");
    await page.getByRole("button", { name: "Move to the D devices bin" }).click();

    await page.goto("/hub/handovers");
    await expect(page.getByText(/1 items, 14.0 kg/)).toBeVisible();
    await page.getByLabel("Dismantling partner").fill("VRRG Group, Gangyal");
    await page.getByLabel("Receipt number").fill("R-001");
    await page.getByLabel("Total weight on receipt (kg)").fill("14");
    await page.getByRole("button", { name: /Save handover/ }).click();
    await expect(page.getByRole("cell", { name: "R-001" })).toBeVisible();
    await expect(page.getByText("The bin is empty.")).toBeVisible();
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
    await page.getByLabel(/Ownership/).check();
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await page.getByRole("link", { name: "Open item" }).click();
    await page.getByRole("button", { name: "Add part" }).click();
    await page.getByLabel("Part type").selectOption("ram");
    await page.getByLabel("Part description").fill("8 GB DDR4");
    await page.getByLabel("Price (₹)").fill("900");
    await page.getByRole("button", { name: "Save parts, shell to scrap" }).click();
    await expect(page.getByText("Parts tagged. Shell moved to the D devices bin.")).toBeVisible();
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
    await page.getByLabel("Source").selectOption("repair_shop");
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
    await page.getByLabel(/Ownership/).check();
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await expect(page.getByRole("link", { name: "Open item" })).toBeVisible();

    await page.goto("/hub/kpis");
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
  test("/hub/team asks visitors to log in and shows no accounts", async ({ page }) => {
    await page.goto("/hub/team");
    await expect(page.getByRole("heading", { name: "Log in to continue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Make admin" })).toHaveCount(0);
  });

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

test.describe("settings (admin only)", () => {
  test("asks visitors to log in and shows no settings", async ({ page }) => {
    await page.goto("/hub/settings");
    await expect(page.getByRole("heading", { name: "Log in to continue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Settings" })).toHaveCount(0);
  });
});

test.describe("hub overview, menu and search", () => {
  test("the overview lists today's stock to-dos and links to the KPIs", async ({ page }) => {
    await page.goto("/hub");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    await expect(page.getByText("No stock rule or handover needs you today.")).toBeVisible();
    await expect(page.getByText(/arrive in the shared database/)).toBeVisible();

    await page.goto("/hub/intake");
    await page.getByLabel("Source").selectOption("repair_shop");
    await page.getByLabel("Category").selectOption("monitor");
    await page.getByLabel("Brand").fill("Lenovo");
    await page.getByLabel("Grade (if tested now)").selectOption("A");
    await page.getByLabel("We paid (₹)").fill("500");
    await page.getByLabel(/Ownership/).check();
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await expect(page.getByRole("link", { name: "Open item" })).toBeVisible();
    // A freshly graded item isn't overdue for anything yet.
    await page.goto("/hub");
    await expect(page.getByText("No stock rule or handover needs you today.")).toBeVisible();
    await page.getByRole("link", { name: "KPIs", exact: true }).first().click();
    await expect(page).toHaveURL(/\/hub\/kpis$/);
    await expect(page.getByRole("heading", { level: 1, name: "KPIs" })).toBeVisible();
  });

  test("the menu groups the screens, and on a hub laptop lists the admin ones too", async ({
    page,
  }) => {
    await page.goto("/hub");
    const menu = page.getByRole("navigation", { name: "Hub" });
    for (const name of ["Overview", "Intake", "KPIs", "Links & QR codes", "Audit log", "Settings"])
      await expect(menu.getByRole("link", { name, exact: true })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("search finds an item by its tag number and a shop by its market", async ({ page }) => {
    await page.goto("/hub/partners");
    await page.getByLabel("Shop name").fill("Gupta Electronics");
    await page.getByLabel("Phone").first().fill("9876543211");
    await page.getByRole("button", { name: "Add shop" }).click();
    await page.goto("/hub/intake");
    await page.getByLabel("Source").selectOption("repair_shop");
    await page.getByLabel("Category").selectOption("monitor");
    await page.getByLabel("Brand").fill("Dell");
    await page.getByLabel("Grade (if tested now)").selectOption("A");
    await page.getByLabel("We paid (₹)").fill("500");
    await page.getByLabel(/Ownership/).check();
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await expect(page.getByRole("link", { name: "Open item" })).toBeVisible();

    await page.goto("/hub");
    await page.getByRole("searchbox", { name: "Search the hub" }).fill("1");
    await page.getByRole("searchbox", { name: "Search the hub" }).press("Enter");
    await expect(page).toHaveURL(/\/hub\/search\?q=1$/);
    await expect(page.getByRole("link", { name: /RL-JMU-0001/ })).toBeVisible();

    await page.goto("/hub/search?q=raghunath");
    await expect(page.getByRole("link", { name: /Gupta Electronics/ })).toBeVisible();
    await expect(page.getByText(/No items match/)).toBeVisible();
  });

  for (const [path, heading] of [
    ["/hub/links", "Links & QR codes"],
    ["/hub/audit", "Audit log"],
  ]) {
    test(`${path} is for admins: visitors are asked to log in`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Log in to continue" })).toBeVisible();
      await expect(page.getByRole("heading", { name: heading })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute(
        "href",
        `/login?next=${encodeURIComponent(path)}`,
      );
      await expect(page.getByRole("link", { name: "Public site" }).last()).toBeVisible();
    });
  }
});

test.describe("listing controls", () => {
  test("hide, correct with a reason, sell, take back and scrap", async ({ page }) => {
    await page.goto("/hub/intake");
    await page.getByLabel("Source").selectOption("repair_shop");
    await page.getByLabel("Category").selectOption("monitor");
    await page.getByLabel("Brand").fill("LG");
    await page.getByLabel("Model").fill("22MK400");
    await page.getByLabel("Grade (if tested now)").selectOption("A");
    await page.getByLabel("We paid (₹)").fill("400");
    await page.getByLabel(/Ownership/).check();
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await page.getByRole("link", { name: "Open item" }).click();
    await page.getByLabel("List price (₹)").fill("2500");
    await page.getByRole("button", { name: "List online" }).click();
    await expect(page.getByText(/Listed at ₹2,500/).first()).toBeVisible();

    // Hidden items stay out of the shop file.
    await page.getByRole("button", { name: "Hide from the shop" }).click();
    await expect(page.getByText("The item is hidden from the public site.")).toBeVisible();
    await page.goto("/hub/data");
    await expect(page.getByText(/0 listed items?/)).toBeVisible();
    await page.goBack();

    await page.getByRole("button", { name: "Show in the shop" }).click();
    await page.getByRole("button", { name: /Edit brand, model or description/ }).click();
    await page.getByLabel("Model").last().fill("22MK430");
    await page.getByRole("button", { name: "Save the correction" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Say why" })).toBeVisible();
    await page
      .getByLabel("Why the change (goes into the history)")
      .fill("Model number misread at intake");
    await page.getByRole("button", { name: "Save the correction" }).click();
    await expect(page.getByText("model: Model number misread at intake")).toBeVisible();

    await page.getByRole("button", { name: "Mark sold" }).click();
    await page.getByRole("button", { name: /The buyer returned it/ }).click();
    await page.getByLabel(/What happened/).fill("Dead pixels found at home (warranty)");
    await page.getByRole("button", { name: "Record the return" }).click();
    await expect(page.getByText("Return recorded. Decide where it goes next.")).toBeVisible();
    await page.getByRole("button", { name: "Send it to the D devices bin" }).click();
    await expect(page.getByText("Sent to the D devices bin.")).toBeVisible();
    await expect(page.getByText(/returned · Dead pixels found at home/)).toBeVisible();
  });
});

test.describe("ReLoop Checked", () => {
  test("a grade B item is inspected before it can be listed", async ({ page }) => {
    await page.goto("/hub/intake");
    await page.getByLabel("Source").selectOption("repair_shop");
    await page.getByLabel("Category").selectOption("monitor");
    await page.getByLabel("Brand").fill("Samsung");
    await page.getByLabel("Grade (if tested now)").selectOption("B");
    await page.getByLabel("We paid (₹)").fill("300");
    await page.getByLabel(/Ownership/).check();
    await page.getByRole("button", { name: "Save and assign tag" }).click();
    await page.getByRole("link", { name: "Open item" }).click();
    await page.getByLabel("List price (₹)").fill("2000");
    await expect(page.getByText(/Save the inspection \(above\) before listing/)).toBeVisible();
    await expect(page.getByRole("button", { name: "List online" })).toBeDisabled();

    // Every check needs a result.
    await page.getByRole("button", { name: "Save inspection and grade" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Record a result for" })).toBeVisible();
    for (const check of ["Powers on", "Display", "Inputs"])
      await page.getByLabel(check, { exact: true }).selectOption("pass");
    await page.getByLabel("No dead pixels").selectOption("fail");
    await page.getByRole("button", { name: "Save inspection and grade" }).click();
    await expect(page.getByText("Inspection saved: grade B.")).toBeVisible();
    await page.getByLabel("List price (₹)").fill("2000");
    await page.getByRole("button", { name: "List online" }).click();
    await expect(page.getByText(/Listed at ₹2,000/).first()).toBeVisible();
  });

  test("sample items say they weren't inspected", async ({ page }) => {
    await page.goto("/shop/RL-JMU-0001");
    await expect(page.getByRole("heading", { name: "ReLoop Checked" })).toBeVisible();
    await expect(page.getByText(/Sample, not inspected/)).toBeVisible();
  });
});

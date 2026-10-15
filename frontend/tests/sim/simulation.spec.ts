import { expect, test, type Page } from "@playwright/test";
import { DEMO_PASSWORD, loginAs } from "./helpers";

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

  test("the demo admin reaches the hub KPIs with six months of data", async ({ page }) => {
    await loginAs(page, "demo-admin@reloop.demo", "/hub/kpis");
    await expect(page.getByRole("heading", { name: "KPIs" })).toBeVisible();
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

test.describe("hub home and landing (real logins)", () => {
  test("hub staff land on the hub overview, without the admin screens", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("demo-staff@reloop.demo");
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/hub$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1, name: /Good to see you/ })).toBeVisible();
    const menu = page.getByRole("navigation", { name: "Hub" });
    await expect(menu.getByRole("link", { name: "Intake", exact: true })).toBeVisible();
    for (const name of ["Users", "Team", "Audit log", "Settings"])
      await expect(menu.getByRole("link", { name, exact: true })).toHaveCount(0);
    await page.goto("/hub/audit");
    await expect(page.getByRole("heading", { name: "For ReLoop admins only" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the hub overview" })).toBeVisible();
  });

  test("a buyer comes back to the page they logged in from", async ({ page, isMobile }) => {
    test.skip(isMobile, "the header link is the same in the mobile menu");
    await page.goto("/what-we-accept");
    await page.locator("header").getByRole("link", { name: "Log in" }).click();
    await page.getByLabel(/email/i).fill("demo-buyer@reloop.demo");
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/what-we-accept$/, { timeout: 20_000 });
  });

  test("the demo admin sees the queues, link visits per day and the audit log", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "one viewport is enough");
    await loginAs(page, "demo-admin@reloop.demo", "/hub");
    await expect(page.getByText("Loading the queues…")).toHaveCount(0, { timeout: 15_000 });
    await expect(
      page
        .getByRole("link", {
          name: /waiting for verification|to review|new reservation|to answer|to schedule|answer/,
        })
        .first(),
    ).toBeVisible();
    await page.goto("/hub/links");
    await expect(page.getByRole("heading", { name: "Visits over time" })).toBeVisible();
    await expect(page.getByText(/Most in one day: \d+/)).toBeVisible({ timeout: 15_000 });
    await page.goto("/hub/audit");
    await expect(page.getByRole("table", { name: "Audit log entries" })).toBeVisible({
      timeout: 15_000,
    });
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Your hub tools" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Audit log/ })).toBeVisible();
  });
});

test.describe("accounts and requests (real logins)", () => {
  test.skip(({ isMobile }) => isMobile, "one viewport is enough for shared demo data");

  /** As the demo buyer, asks a question about the first item in the shop; returns its tag. */
  async function askAsBuyer(page: Page, question: string) {
    await loginAs(page, "demo-buyer@reloop.demo", "/account");
    await page.goto("/shop");
    await page.locator("main article a").first().click();
    await page.waitForURL(/\/shop\/RL-JMU-\d+$/);
    const tag = (page.url().match(/RL-JMU-\d+/) ?? [""])[0];
    await page.getByRole("button", { name: "Ask a question" }).click();
    await page.getByLabel("Your name").fill("Demo Buyer");
    await page.getByLabel("Phone / WhatsApp").fill("9000000123");
    await page.getByLabel("Your question").fill(question);
    await page.getByRole("button", { name: "Prepare my question" }).click();
    await expect(page.getByText("Your request is saved", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    return tag;
  }

  test("a signed-in buyer's question appears under My requests, with a status page, and they can cancel it", async ({
    page,
  }) => {
    const tag = await askAsBuyer(page, `Does it come with a charger? (journey test ${Date.now()})`);
    const statusHref = await page
      .getByRole("link", { name: "Open the status page" })
      .getAttribute("href");
    expect(statusHref).toMatch(/^\/status\/[0-9a-f]{64}$/);
    await page.goto(statusHref!);
    await expect(
      page.getByRole("heading", { level: 1, name: `Question for ${tag}` }),
    ).toBeVisible();
    await expect(page.getByText("Sent: ReLoop will look at it soon")).toBeVisible();
    await expect(page.getByText("9000000123")).toHaveCount(0);

    await page.goto("/account/requests");
    // This run's request: its card links to its own status page.
    const card = page.locator("li").filter({ has: page.locator(`a[href="${statusHref}"]`) });
    await card.getByRole("button", { name: "Cancel" }).click();
    await card.getByRole("button", { name: "Yes, cancel it" }).click();
    await expect(card.getByText("Cancelled by you")).toBeVisible();
    await page.goto(statusHref!);
    await expect(page.getByText("Cancelled by you").first()).toBeVisible();
  });

  test("hub staff cancel a request with a reason, and the buyer is told why", async ({
    page,
    browser,
  }) => {
    // Unique per run: an earlier run may have left the same question behind.
    const question = `Can you hold it until Saturday? (journey test ${Date.now()})`;
    const tag = await askAsBuyer(page, question);
    const staff = await (await browser.newContext()).newPage();
    await loginAs(staff, "demo-staff@reloop.demo", "/hub/requests");
    const row = staff.locator("li").filter({ hasText: question }).first();
    await expect(row.getByText(/Sent from a ReLoop account/)).toBeVisible({ timeout: 15_000 });
    await row.getByRole("button", { name: "Cancel…" }).click();
    await row
      .getByLabel("Reason (the person sees it)")
      .fill("Already sold in the hub shop (journey test)");
    await row.getByRole("button", { name: "Cancel the request" }).click();
    await expect(row).toHaveCount(0, { timeout: 15_000 });
    await staff.context().close();

    await page.goto("/account/notifications");
    // In the page, not the header bell's (closed) list.
    const main = page.getByRole("main");
    await expect(main.getByText(`Your question for ${tag} was cancelled`).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      main.getByText("Already sold in the hub shop (journey test)").first(),
    ).toBeVisible();
    await page.goto("/account/requests");
    await expect(
      page.getByText("ReLoop's reason: Already sold in the hub shop (journey test)").first(),
    ).toBeVisible();
  });

  test("the shared demo logins can't be edited or deleted, and say so", async ({ page }) => {
    await loginAs(page, "demo-buyer@reloop.demo", "/account/settings");
    await expect(page.getByText("This is a shared demo login")).toBeVisible();
    await page.getByLabel("Your name").fill("Someone else");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Demo accounts stay as they are" }),
    ).toBeVisible();
  });

  test("the demo admin sees the deletion queue and the booked pickup", async ({ page }) => {
    await loginAs(page, "demo-admin@reloop.demo", "/hub/deletions");
    await expect(page.getByRole("heading", { level: 1, name: "Account deletions" })).toBeVisible();
    await expect(page.getByText(/No open deletion requests|days left|overdue/).first()).toBeVisible(
      {
        timeout: 15_000,
      },
    );
    await page.goto("/hub/requests");
    await expect(page.getByText(/scheduled for \d{4}-\d{2}-\d{2}/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("offers, pickups and payouts (real logins)", () => {
  test.skip(({ isMobile }) => isMobile, "one viewport is enough for shared demo data");

  test("the demo shop answers offers in the app, sees its pickup day and downloads a receipt", async ({
    page,
  }) => {
    await loginAs(page, "demo-shop@reloop.demo", "/account");
    await expect(page.getByRole("button", { name: "Accept the offer" }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Pickup on (Tuesday|Friday)/).first()).toBeVisible();
    await expect(page.getByText(/Payments from ReLoop/)).toBeVisible();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: /Receipt \(PDF\) for RL-PAY-/ })
      .first()
      .click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^RL-PAY-\d{4}-\d{4}\.pdf$/);
    const bytes = await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c));
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("hub staff see the accepted lot's pickup and the payment to record", async ({ page }) => {
    await loginAs(page, "demo-staff@reloop.demo", "/hub/submissions");
    const accepted = page.locator("section").filter({ hasText: "Accepted: collect on the route" });
    await expect(
      accepted.getByRole("button", { name: "Missed: move to the next route day" }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Record payment" }).first()).toBeVisible();
    await expect(page.getByText(/receipt RL-PAY-\d{4}-\d{4}/).first()).toBeVisible();
    await page.goto("/hub");
    await expect(page.getByText(/pickups? on the next route day/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("listing controls (real logins)", () => {
  test.skip(({ isMobile }) => isMobile, "one viewport is enough for shared demo data");

  test("an item staff hid is gone from the public shop, and its page says it isn't there", async ({
    page,
    browser,
  }) => {
    await loginAs(page, "demo-staff@reloop.demo", "/hub/items?status=listed");
    // Every item loads, not just the first page of 1,000 the database sends at once.
    const total = page.getByText(/[\d,]+ items in the shared database/);
    await expect(total).toBeVisible({ timeout: 20_000 });
    expect(Number((await total.textContent())!.replace(/\D/g, ""))).toBeGreaterThan(1000);
    const row = page.locator("tr").filter({ hasText: "Hidden" }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    const tag = (await row.getByRole("link").first().textContent())!.trim();
    expect(tag).toMatch(/^RL-JMU-\d+$/);
    const visitor = await (await browser.newContext()).newPage();
    const res = await visitor.goto(`/shop/${tag}`);
    expect(res?.status()).toBe(404);
    await visitor.goto("/shop");
    await expect(visitor.locator(`a[href="/shop/${tag}"]`)).toHaveCount(0);
    await visitor.context().close();
  });
});

test.describe("warranty claims (real logins)", () => {
  test.skip(({ isMobile }) => isMobile, "one viewport is enough for shared demo data");

  test("the demo buyer sees their device's warranty and open claim; staff see it in the hub", async ({
    page,
    browser,
  }) => {
    await loginAs(page, "demo-buyer@reloop.demo", "/account/warranty");
    await expect(page.getByText(/days? of warranty left/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Waiting for ReLoop").first()).toBeVisible();
    const staff = await (await browser.newContext()).newPage();
    await loginAs(staff, "demo-staff@reloop.demo", "/hub/warranty");
    await expect(staff.getByText(/The battery drops from 100% to 20%/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(staff.getByRole("button", { name: "Accept" }).first()).toBeVisible();
    await staff.context().close();
  });
});

test.describe("ReLoop Checked (simulated stock)", () => {
  test("a listed item shows its inspection report, wipe and warranty", async ({ page }) => {
    await page.goto("/shop?category=laptop");
    await page.locator("main article a").first().click();
    await expect(page.getByRole("heading", { name: "ReLoop Checked" })).toBeVisible();
    await expect(page.getByText(/Inspected at the Jammu hub on \d+ \w+ \d{4}/)).toBeVisible();
    await expect(
      page.getByText(/Personal data wiped on|doesn't store personal data|wiped before sale/),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Warranty terms" })).toBeVisible();
  });
});

test.describe("item passport (simulated stock)", () => {
  test("a listed item's passport shows its journey, without prices or people", async ({ page }) => {
    await page.goto("/shop?category=laptop");
    await page.locator("main article a").first().click();
    await page.getByRole("link", { name: "See its passport" }).click();
    await expect(page).toHaveURL(/\/passport\/RL-JMU-\d+$/);
    await expect(page.getByText("Received at the hub")).toBeVisible();
    await expect(page.getByText("Listed for sale")).toBeVisible();
    await expect(page.getByText("₹")).toHaveCount(0);
    await expect(page.getByText(/Simulated Shop|Simulated Buyer/)).toHaveCount(0);
  });

  test("hub staff print an item's tag as a PDF", async ({ page, isMobile }) => {
    test.skip(isMobile, "one viewport is enough");
    await loginAs(page, "demo-staff@reloop.demo", "/hub/items?status=listed");
    await page.locator("tbody tr a").first().click();
    const pdf = page.waitForResponse((r) => /\/api\/tags\/RL-JMU-\d+$/.test(r.url()));
    const popup = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Print tag" }).click();
    const res = await pdf;
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    await (await popup).close();
  });
});

test.describe("public pricing (simulated references)", () => {
  test("a listed item shows its estimated fair-price band with source and date", async ({
    page,
  }) => {
    await page.goto("/shop?category=laptop");
    await page.locator("main article a").first().click();
    await expect(
      page.getByText(/Estimated fair price for this kind of item and\s+grade/),
    ).toBeVisible();
    await expect(page.getByText(/Estimate from Simulated reference/)).toBeVisible();
    await expect(page.getByText(/Our price is (below|within|above) the usual range/)).toBeVisible();
  });

  test("hub staff see the simulated references and which are too old", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "one viewport is enough");
    await loginAs(page, "demo-staff@reloop.demo", "/hub/pricing/references");
    await expect(page.getByRole("table", { name: "Reference prices" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Simulated reference/).first()).toBeVisible();
  });
});

test.describe("shop discovery (simulated stock)", () => {
  test("pages of results, a brand filter, compare and recently viewed", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "one viewport is enough");
    await page.goto("/shop");
    await expect(page.getByText(/Showing 1–24 of \d+/)).toBeVisible();
    await page
      .getByRole("navigation", { name: "Pages of results" })
      .getByRole("link", { name: "Next" })
      .click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Showing 25–48 of/)).toBeVisible();

    await page.goto("/shop?category=laptop");
    const brand = page.getByLabel("Brand");
    const first = (await brand.locator("option").nth(1).textContent())!.trim();
    await brand.selectOption(first);
    await expect(page).toHaveURL(
      new RegExp(`brand=${encodeURIComponent(first).replace(/%20/g, "\\+|%20")}`),
    );

    const links = page.locator("main article a");
    const a = await links.nth(0).getAttribute("href");
    const b = await links.nth(1).getAttribute("href");
    for (const href of [a, b]) {
      await page.goto(href!);
      await page.getByRole("button", { name: "Compare" }).click();
      await expect(page.getByRole("button", { name: "Added to compare" })).toBeVisible();
    }
    await page.getByRole("link", { name: "Compare 2 items" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Compare items" })).toBeVisible();
    await expect(page.locator("thead th a")).toHaveCount(2);

    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "Recently viewed" })).toBeVisible();
    await expect(page.getByText(/to compare:/)).toBeVisible();
  });
});

test.describe("saved items (real logins)", () => {
  test.skip(({ isMobile }) => isMobile, "one viewport is enough for shared demo data");

  test("the demo buyer sees saved items with price drops, saves another and removes it", async ({
    page,
  }) => {
    await loginAs(page, "demo-buyer@reloop.demo", "/account/saved");
    await expect(page.getByText(/less than when you saved it/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Sold", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Similar items" }).first()).toBeVisible();

    // An item on sale that isn't saved yet (others may have saved some on the shared login).
    await page.goto("/shop?category=phone");
    const hrefs = await page
      .locator("main article a")
      .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    let id = "";
    for (const href of hrefs.slice(0, 8)) {
      await page.goto(href!);
      const save = page.getByRole("button", { name: /^Saved?$/ });
      await expect(save).toBeEnabled({ timeout: 15_000 });
      if ((await save.getAttribute("aria-pressed")) === "false") {
        id = href!.split("/shop/")[1];
        break;
      }
    }
    expect(id, "an unsaved phone on sale").not.toBe("");
    // The simulation's stock isn't real, so it can't be shared.
    await expect(page.getByRole("link", { name: /Share on WhatsApp/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Save", pressed: false }).click();
    await expect(page.getByRole("button", { name: "Saved", pressed: true })).toBeVisible();
    await page.getByRole("link", { name: "Your saved items" }).click();
    const row = page.getByRole("listitem").filter({ hasText: id });
    await expect(row.getByText("On sale")).toBeVisible();
    await row.getByRole("button", { name: /Remove/ }).click();
    await expect(page.getByRole("listitem").filter({ hasText: id })).toHaveCount(0);
  });
});

test.describe("scrap ledger, Parts Exchange and lots (real logins)", () => {
  test.setTimeout(90_000);

  test("the demo rate card is public and the demo admin sees weigh-ins, bins, exchange and lots", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "one viewport is enough");
    await page.goto("/rate-card");
    await expect(
      page.getByRole("heading", { level: 1, name: "What we pay per kilo" }),
    ).toBeVisible();

    await loginAs(page, "demo-admin@reloop.demo", "/hub/weighins");
    await expect(page.getByRole("heading", { level: 1, name: "Weigh-ins" })).toBeVisible();
    await expect(page.getByText(/kg/).first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/hub/exchange");
    await expect(page.getByRole("heading", { level: 1, name: "Parts Exchange" })).toBeVisible();

    await page.goto("/hub/lots");
    await expect(page.getByRole("heading", { level: 1, name: "Institution lots" })).toBeVisible();

    await page.goto("/hub/handovers");
    await expect(page.getByText(/bin/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("the demo shop owner sees their parts and weigh-ins on their account", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "one viewport is enough");
    await loginAs(page, "demo-shop@reloop.demo", "/account/parts");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/account");
    await expect(page.getByText(/weigh-in|Weigh-in/).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("impact and network (simulated data)", () => {
  test("the impact page draws the flows and the network page lists markets, areas and VRRG kg", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "one viewport is enough");
    await page.goto("/impact");
    await expect(
      page.getByRole("img", { name: "Scrap in kilograms, from source to where it is now" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Month by month" })).toBeVisible();
    await page.goto("/network");
    await expect(page.getByRole("heading", { name: "From Jammu's markets" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "To VRRG Group" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: /Map of the flows between Jammu markets/ }),
    ).toBeVisible();
  });
});

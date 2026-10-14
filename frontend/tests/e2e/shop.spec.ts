import { expect, test } from "@playwright/test";
import { fillShopSubmission, mockShopSubmissions, signInAsShopOwner } from "./shop-owner";

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

test.describe("sample stock", () => {
  test("samples are labelled not for sale and can't be reserved", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByText("Sample · not for sale").first()).toBeVisible();
    await expect(page.getByText("These are sample items")).toBeVisible();
    await page.goto("/shop/RL-JMU-0001");
    // The item's own badge comes before the related items' cards.
    await expect(page.getByText("Sample · not for sale").first()).toBeVisible();
    await expect(
      page.getByText("This is a sample item to show how stock will look."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /reserve/i })).toHaveCount(0);
    await expect(page.getByRole("main").locator('a[href^="https://wa.me/"]')).toHaveCount(0);
  });
});

test.describe("what we accept", () => {
  test("lists what we take, what we don't, and where batteries and dead items go", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "What we accept" })
      .click();
    await expect(page).toHaveURL(/\/what-we-accept$/);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "What we take" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Laptops" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "What we don't take" })).toBeVisible();
    await expect(main.getByText(/fridges, washing machines and air conditioners/)).toBeVisible();
    await expect(main.getByText(/closed metal cabinet with sand/)).toBeVisible();
    await expect(main.getByText(/VRG Groups, Gangyal/)).toBeVisible();
  });

  test("the sell pages and locations link to it, and sell pages offer a WhatsApp chat", async ({
    page,
  }) => {
    for (const path of ["/sell", "/sell/shops", "/sell/institutions", "/locations"]) {
      await page.goto(path);
      await expect(
        page.getByRole("main").getByRole("link", { name: "What we accept" }),
        path,
      ).toHaveAttribute("href", "/what-we-accept");
    }
    for (const path of ["/sell", "/sell/shops", "/sell/institutions", "/what-we-accept"]) {
      await page.goto(path);
      const chat = page.getByRole("main").getByRole("link", { name: /Chat on WhatsApp/ });
      const url = new URL((await chat.getAttribute("href"))!);
      expect(url.host, path).toBe("wa.me");
      expect(url.pathname, path).toBe("/919871276179");
      expect(url.searchParams.get("text"), path).toBe(
        "Hi ReLoop, I'd like to sell old electronics",
      );
      await expect(chat).toHaveAttribute("target", "_blank");
    }
  });
});

test.describe("sell to us", () => {
  test("shop submissions ask visitors to log in or register first", async ({ page }) => {
    await page.goto("/sell/shops");
    await expect(page.getByRole("heading", { name: "Log in to submit items" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
    await expect(page.getByRole("link", { name: "Register as a shop owner" })).toHaveAttribute(
      "href",
      "/register",
    );
    await expect(page.getByLabel("Item name")).toHaveCount(0);
  });

  test("a signed-in shop owner submits several items with their session", async ({ page }) => {
    await signInAsShopOwner(page);
    const requests = await mockShopSubmissions(page);
    await page.goto("/sell/shops");
    await fillShopSubmission(page, ["Redmi 9 boards", "Dead chargers"]);
    await page.getByRole("button", { name: "Submit items to ReLoop" }).click();

    await expect(page.getByRole("status")).toContainText("Your items have been submitted");
    await expect(page.getByRole("status")).toContainText("received 2 item entries");
    expect(requests).toHaveLength(1);
    expect(requests[0].headers()["authorization"]).toBe("Bearer e2e-access-token");
    const sent = requests[0].postDataJSON();
    expect(sent.shopName).toBe("Sharma Mobiles");
    expect(sent.items.map((i: { itemName: string }) => i.itemName)).toEqual([
      "Redmi 9 boards",
      "Dead chargers",
    ]);
    expect(sent.items[1]).toMatchObject({ condition: "Broken", quantity: "2" });
  });

  test("an unverified shop sees why its submission was refused", async ({ page }) => {
    await signInAsShopOwner(page);
    await mockShopSubmissions(page, {
      status: 403,
      body: { error: "Your shop must be verified by ReLoop before you can submit items." },
    });
    await page.goto("/sell/shops");
    await fillShopSubmission(page, ["Old monitors"]);
    await page.getByRole("button", { name: "Submit items to ReLoop" }).click();
    await expect(
      page.getByText("Your shop must be verified by ReLoop before you can submit items."),
    ).toBeVisible();
    await expect(page.getByLabel("Item name")).toHaveValue("Old monitors");
  });

  test("every sell path is reachable from /sell", async ({ page }) => {
    await page.goto("/sell");
    for (const name of ["Become a partner shop", "Book a pickup"]) {
      await expect(
        page.getByRole("main").getByRole("link", { name: new RegExp(name) }),
      ).toBeVisible();
    }
  });
});

test.describe("site", () => {
  test("no horizontal scrolling on any page", async ({ page }) => {
    for (const path of [
      "/",
      "/shop",
      "/shop/RL-JMU-0001",
      "/sell",
      "/sell/shops",
      "/sell/institutions",
      "/how-it-works",
      "/where-scrap-goes",
      "/what-we-accept",
      "/help",
      "/print",
      "/print/partner-poster",
      "/print/awareness-flyer",
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
      /\b(reloop|we) (is|are) (a |an )?(registered|licensed|authori[sz]ed)\b/i,
      /cpcb[- ]registered/i,
      /purchase cost|processing cost|internal notes/i,
      /\bprofit\b/i,
      /to be published/i,
    ];
    for (const path of [
      "/",
      "/shop",
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
      "/register",
      "/login",
    ]) {
      await page.goto(path);
      const text = await page.locator("body").innerText();
      for (const re of banned) expect(text, `${re} found on ${path}`).not.toMatch(re);
    }
  });
});

test.describe("contact details", () => {
  test("the contact page names the grievance officer with an email and phone", async ({ page }) => {
    await page.goto("/contact");
    const main = page.getByRole("main");
    await expect(main.getByText(/grievance officer, Harsh Raj/)).toBeVisible();
    await expect(main.getByRole("link", { name: "+91 98712 76179" }).first()).toHaveAttribute(
      "href",
      "tel:+919871276179",
    );
    await expect(main.getByText("Mon–Sat, 10:00–18:00 IST from November 2026")).toBeVisible();
    await expect(main.getByText(/Old-city market belt, between Raghunath Bazaar/)).toBeVisible();
  });

  test("the privacy policy lists the grievance officer's name, designation and contacts", async ({
    page,
  }) => {
    await page.goto("/privacy");
    await expect(page.getByText("Grievance officer: Harsh Raj (Grievance Officer)")).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "+91 98712 76179" }),
    ).toBeVisible();
  });

  test("the privacy policy states the retention rule the daily clean-up job applies", async ({
    page,
  }) => {
    // Must match public.purge_closed_requests (20261023000001): closed = sold,
    // cancelled or done; deleted 12 months after closing; open requests kept.
    await page.goto("/privacy");
    await expect(
      page.getByText(
        "Open requests are kept until we close them. A closed request (sold, cancelled or done) is deleted automatically 12 months after it was closed, together with the name, phone number and other details in it.",
        { exact: false },
      ),
    ).toBeVisible();
  });
});

test.describe("institution pickup booking", () => {
  test("is saved for staff, then handed off on WhatsApp or email", async ({ page }) => {
    const bodies: unknown[] = [];
    await page.route("**/api/requests", async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.goto("/sell/institutions");
    await page.getByLabel(/^Institution/).fill("IIM Jammu");
    await page.getByLabel(/^Type/).selectOption("College / university");
    await page.getByLabel(/^Contact person/).fill("Ravi Sharma");
    await page.getByLabel(/^Phone/).fill("98765 43210");
    await page.getByLabel(/^What is in the lot/).fill("20 desktops, 15 monitors");
    await page.getByRole("button", { name: "Prepare my booking" }).click();
    await expect(page.getByText("Almost done: send this to ReLoop")).toBeVisible();
    expect(bodies).toEqual([
      expect.objectContaining({
        kind: "institution_pickup",
        fields: expect.objectContaining({
          institution: "IIM Jammu",
          contact: "Ravi Sharma",
          phone: "98765 43210",
        }),
      }),
    ]);
    await expect(page.getByText(/couldn't keep a copy/)).toHaveCount(0);
  });
});

test.describe("impact counter", () => {
  test("shows the pilot date on the home page until there are real totals", async ({ page }) => {
    await page.goto("/");
    const impact = page.getByRole("region", { name: "Our impact so far" });
    await expect(impact.getByText("Pilot starts November 2026")).toBeVisible();
    await expect(impact.getByText("items reused")).toHaveCount(0);
  });
});

test.describe("help for partner shops", () => {
  test("switches between English and Hindi, marks the Hindi, and remembers the choice", async ({
    page,
  }) => {
    await page.goto("/sell/shops");
    await page.getByRole("link", { name: "Step-by-step help, in English and Hindi" }).click();
    await expect(page).toHaveURL(/\/help$/);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "1. Sign up" })).toBeVisible();
    await expect(main.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const title of [
      "2. Wait for verification",
      "3. Submit your items",
      "4. See our offer",
      "5. Pickup",
      "6. Payment",
      "7. Contact us",
    ])
      await expect(main.getByRole("heading", { name: title })).toBeVisible();

    await main.getByRole("button", { name: "हिन्दी" }).click();
    await expect(main.getByRole("heading", { name: "1. साइन अप करें" })).toBeVisible();
    await expect(main.locator('[lang="hi"]').filter({ hasText: "साइन अप करें" })).toHaveCount(1);
    await expect(main.getByRole("link", { name: "/register" })).toHaveAttribute(
      "href",
      "/register",
    );

    await page.reload();
    await expect(main.getByRole("heading", { name: "1. साइन अप करें" })).toBeVisible();
    await main.getByRole("button", { name: "English" }).click();
    await expect(main.getByRole("heading", { name: "1. Sign up" })).toBeVisible();
  });

  test("is linked from the footer", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Help for shops" }),
    ).toHaveAttribute("href", "/help");
  });
});

test.describe("the real site is not the simulation", () => {
  test("has no demo page, no simulation banner, and lets search engines in", async ({
    page,
    request,
  }) => {
    expect((await request.get("/demo")).status()).toBe(404);
    await page.goto("/");
    await expect(page.getByText("Simulation based on business plan assumptions")).toHaveCount(0);
    expect(await (await request.get("/robots.txt")).text()).not.toMatch(/Disallow: \/\s*$/m);
  });
});

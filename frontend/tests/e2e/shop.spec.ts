import { expect, test } from "@playwright/test";
import { goViaMenu } from "./nav";
import { publicPaths } from "./paths";
import { fillShopSubmission, mockShopSubmissions, signInAsShopOwner } from "./shop-owner";

test.describe("public shop", () => {
  test("home explains the loop and shows graded stock", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Collect. Grade.");
    await expect(page.locator("main article")).toHaveCount(7);
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
    await expect(page.locator("main article")).toHaveCount(7);
  });

  test("item page shows ID, grade, warranty and delivery", async ({ page }) => {
    await page.goto("/shop/RL-JMU-0001");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lenovo ThinkPad T480");
    await expect(
      page.getByText("RL-JMU-0001", { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("30-day warranty").first()).toBeVisible();
    await expect(page.getByText("₹50 delivery")).toBeVisible();
    await expect(page.getByText(/in Jammu city, or collect from the hub/)).toBeVisible();
  });

  test("parts have no warranty, and nothing ships outside Jammu", async ({ page }) => {
    await page.goto("/shop/RL-JMU-0008");
    await expect(page.getByText(/day warranty/)).toHaveCount(0);
    for (const id of ["RL-JMU-0001", "RL-JMU-0002", "RL-JMU-0008"]) {
      await page.goto(`/shop/${id}`);
      await expect(page.getByText(/ships? (across|outside)/i)).toHaveCount(0);
      await expect(page.getByText(/shipping/i)).toHaveCount(0);
    }
    await page.goto("/shop/compare?ids=RL-JMU-0001,RL-JMU-0002");
    await expect(page.getByText("Jammu city only, or collect from the hub").first()).toBeVisible();
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
    await goViaMenu(page, isMobile, "For shops & institutions", "What we accept");
    await expect(page).toHaveURL(/\/what-we-accept$/);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "What we take" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Laptops" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "What we don't take" })).toBeVisible();
    await expect(main.getByText(/fridges, washing machines and air conditioners/)).toBeVisible();
    await expect(main.getByText(/TVs, printers, UPS units and small appliances/)).toBeVisible();
    await expect(main.getByText(/closed metal cabinet with sand/)).toBeVisible();
    await expect(main.getByText(/VRRG Group, Gangyal/).first()).toBeVisible();
    await expect(main.getByText(/not from homes/).first()).toBeVisible();
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
        "Hi ReLoop, I run a shop or represent an institution and would like to sell to ReLoop. Our name is: ",
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
    for (const name of ["Become a partner shop", "Book a lot pickup", "The full rate card"]) {
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
      "/print/counter-card",
      "/print/awareness-flyer",
      "/rate-card",
      "/warranty",
      "/impact",
      "/network",
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
    await goViaMenu(page, isMobile, "For shops & institutions", "For shops & institutions");
    await expect(page).toHaveURL(/\/sell$/);
  });

  test("public pages never make claims the business plan doesn't support", async ({
    page,
    request,
  }) => {
    const banned = [
      /buyers across india/i,
      /nationwide/i,
      /nationally/i,
      /ship(s|ping|ped)? (across|outside) (india|jammu)/i,
      /publish(es)? instantly/i,
      /verified partners/i,
      /we are (an )?authori[sz]ed/i,
      /certified/i,
      /certificate/i,
      /₹73/,
      /margin/i,
      /gross margin/i,
      /break-?even/i,
      /\b(reloop|we) (is|are) (a |an )?(registered|licensed|authori[sz]ed|approved)\b/i,
      /(authori[sz]ed|approved|endorsed|registered) by (the )?(jkpcc|jmc|cpcb|j&k|jammu municipal)/i,
      /cpcb[- ]registered/i,
      /purchase cost|processing cost|internal notes/i,
      /\bprofit\b/i,
      /profitab/i,
      /set-?up cost/i,
      /\bCOGS\b/,
      /P&L/,
      /fixed costs/i,
      /\blakh\b/i,
      /is legal/i,
      /unregistered (van|dealer)/i,
      /to be published/i,
      /matches or beats|beats the dealer|beats? (all )?(the )?(other )?dealers|best price|dealers pay|guaranteed/i,
      /\b(dismantl(e|es|ed|ing)|recycl(e|es|ed|ing)) (it|them|your|the scrap) ourselves/i,
      /kept out of landfill/i,
      /unclaimed (customer )?devices/i,
      /\bhouseholds?\b.*\b(sell|drop[- ]?off|collect)/i,
    ];
    const paths = await publicPaths(request);
    expect(paths.length, "the page list should not be empty").toBeGreaterThan(15);
    for (const path of paths) {
      await page.goto(path);
      const text = await page.locator("body").innerText();
      for (const re of banned) expect(text, `${re} found on ${path}`).not.toMatch(re);
    }
  });
});

test.describe("launch wording", () => {
  test("the hub opening date appears only on the locations and contact pages", async ({
    page,
    request,
  }) => {
    // Institution bookings open in January 2027 (decision 14); that date may appear on /sell/institutions.
    const dated = /\b(november 2026|hub opens|opening november)\b/i;
    for (const path of await publicPaths(request)) {
      if (["/locations", "/contact"].includes(path)) continue;
      await page.goto(path);
      const text = await page.locator("body").innerText();
      expect(text, `an opening date found on ${path}`).not.toMatch(dated);
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
    await expect(main.getByText("Mon–Sat, 10:00–18:00 IST.", { exact: false })).toBeVisible();
    await expect(main.getByText(/Gandhi Nagar, between Bahu Plaza and Gole Market/)).toBeVisible();
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
  test("is saved for staff as a ticket, with WhatsApp or email as extras", async ({ page }) => {
    const bodies: unknown[] = [];
    await page.route("**/api/requests", async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, json: { ok: true, ticket: "RQ-3F9A2C" } });
    });
    await page.goto("/sell/institutions");
    await page.getByLabel(/^Institution/).fill("IIM Jammu");
    await page.getByLabel(/^Type/).selectOption("College / university");
    await page.getByLabel(/^Contact person/).fill("Ravi Sharma");
    await page.getByLabel(/^Phone/).fill("98765 43210");
    await page.getByLabel(/^What is in the lot/).fill("20 desktops, 15 monitors");
    await page.getByRole("button", { name: "Send my booking" }).click();
    await expect(page.getByText("Booking received")).toBeVisible();
    await expect(page.getByText("RQ-3F9A2C")).toBeVisible();
    await expect(page.getByText("Almost done: send this to ReLoop")).toHaveCount(0);
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

  test("gives the visitor the request's private status link once it is saved", async ({ page }) => {
    const token = "ab".repeat(32);
    await page.route("**/api/requests", (route) =>
      route.fulfill({ status: 200, json: { ok: true, statusToken: token, linked: false } }),
    );
    await page.goto("/sell/institutions");
    await page.getByLabel(/^Institution/).fill("IIM Jammu");
    await page.getByLabel(/^Type/).selectOption("College / university");
    await page.getByLabel(/^Contact person/).fill("Ravi Sharma");
    await page.getByLabel(/^Phone/).fill("98765 43210");
    await page.getByLabel(/^What is in the lot/).fill("20 desktops");
    await page.getByRole("button", { name: "Send my booking" }).click();
    await expect(page.getByText("Booking received")).toBeVisible();
    await expect(
      page.getByText(/Anyone with the link sees its stage, never your details/),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Open the status page" })).toHaveAttribute(
      "href",
      `/status/${token}`,
    );
    await expect(page.getByRole("link", { name: "My requests" })).toHaveCount(0);
  });

  test("shows no status link when the request couldn't be saved", async ({ page }) => {
    await page.route("**/api/requests", (route) =>
      route.fulfill({ status: 503, json: { error: "x" } }),
    );
    await page.goto("/sell/institutions");
    await page.getByLabel(/^Institution/).fill("IIM Jammu");
    await page.getByLabel(/^Type/).selectOption("College / university");
    await page.getByLabel(/^Contact person/).fill("Ravi Sharma");
    await page.getByLabel(/^Phone/).fill("98765 43210");
    await page.getByLabel(/^What is in the lot/).fill("20 desktops");
    await page.getByRole("button", { name: "Send my booking" }).click();
    await expect(page.getByText(/couldn't keep a copy/)).toBeVisible();
    await expect(page.getByText("Almost done: send this to ReLoop")).toBeVisible();
    await expect(page.getByText("Booking received")).toHaveCount(0);
  });
});

test.describe("impact counter", () => {
  test("shows the pilot date on the home page until there are real totals", async ({ page }) => {
    await page.goto("/");
    const impact = page.getByRole("region", { name: "Our impact so far" });
    await expect(impact.getByText("The Jammu pilot is running")).toBeVisible();
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
    await expect(
      main.getByRole("heading", { name: "1. Scrap at the counter (no account needed)" }),
    ).toBeVisible();
    await expect(main.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const title of [
      "4. Wait for verification",
      "6. See our offer",
      "7. The weekly pickup",
      "8. Payment and receipts",
      "10. Contact us",
    ])
      await expect(main.getByRole("heading", { name: title })).toBeVisible();

    await main.getByRole("button", { name: "हिन्दी" }).click();
    await expect(
      main.getByRole("heading", { name: "1. काउंटर पर कबाड़ (अकाउंट ज़रूरी नहीं)" }),
    ).toBeVisible();
    await expect(main.locator('[lang="hi"]').filter({ hasText: "काउंटर पर कबाड़" })).toHaveCount(1);
    await expect(main.getByRole("link", { name: "/register" })).toHaveAttribute(
      "href",
      "/register",
    );

    await page.reload();
    await expect(
      main.getByRole("heading", { name: "1. काउंटर पर कबाड़ (अकाउंट ज़रूरी नहीं)" }),
    ).toBeVisible();
    await main.getByRole("button", { name: "English" }).click();
    await expect(
      main.getByRole("heading", { name: "1. Scrap at the counter (no account needed)" }),
    ).toBeVisible();
  });

  test("is linked from the footer", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Help for partner shops" }),
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

test.describe("finding items", () => {
  test("a price range narrows the results and stays in the address", async ({ page }) => {
    await page.goto("/shop");
    await page.getByLabel("Highest price (₹)").fill("1000");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/max=1000/);
    await expect(page.getByText(/for up to ₹1,000/)).toBeVisible();
    const prices = await page.locator("main article .font-display").allTextContents();
    expect(prices.length).toBeGreaterThan(0);
    for (const p of prices) expect(Number(p.replace(/\D/g, ""))).toBeLessThanOrEqual(1000);
  });

  test("results can be sorted by the biggest saving", async ({ page }) => {
    await page.goto("/shop?sort=saving");
    await expect(page.getByLabel("Sort by")).toHaveValue("saving");
    await expect(page.locator("main article").first()).toBeVisible();
  });

  test("the compare page shows items side by side from a shareable link", async ({ page }) => {
    await page.goto("/shop/compare?ids=RL-JMU-0001,RL-JMU-0002,nope");
    await expect(page.getByRole("heading", { level: 1, name: "Compare items" })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Warranty" })).toBeVisible();
    await expect(page.locator("thead th a")).toHaveCount(2);
    await page.goto("/shop/compare");
    await expect(page.getByText("Nothing to compare yet")).toBeVisible();
  });
});

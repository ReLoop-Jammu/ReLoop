import { expect, test } from "@playwright/test";
import { publicPaths } from "./paths";

/** The pages with a Hindi version (faculty feedback, 2026-10-23). */
const HINDI_PAGES = ["/", "/sell", "/sell/shops", "/sell/institutions"];

test.describe("English / हिन्दी", () => {
  test("the switch shows Hindi, is remembered across pages and reloads, and switches back", async ({
    page,
  }) => {
    await page.goto("/sell/shops");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveAccessibleName(
      "Sell your shop's old phones, laptops and parts, every week",
    );
    await page.getByRole("button", { name: "हिन्दी" }).click();
    await expect(heading).toHaveAccessibleName(
      "अपनी दुकान के पुराने फ़ोन, लैपटॉप और पार्ट्स हर हफ़्ते बेचिए",
    );
    await expect(heading.locator('[lang="hi"]')).toBeVisible();
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /जाँचा हुआ फ़ोन या लैपटॉप ख़रीदें/ }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "हिन्दी" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("link", { name: /^Buy a tested phone or laptop/ })).toBeVisible();
  });

  test("an untranslated page tells a Hindi reader it is mostly in English", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("reloop-lang", "hi"));
    await page.goto("/faq");
    await expect(page.getByText(/ज़्यादातर हिस्सा अभी अंग्रेज़ी में है/)).toBeVisible();
    await page.goto("/sell");
    await expect(page.getByText(/ज़्यादातर हिस्सा अभी अंग्रेज़ी में है/)).toBeHidden();
  });

  test("the Hindi pages make no claim the business plan doesn't support", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("reloop-lang", "hi"));
    const banned = [
      // profit, "is legal", certified, guaranteed, nationwide, lakh
      /मुनाफ़ा|मुनाफा|लाभदायक/,
      /(क़ानूनी|कानूनी|वैध) है/,
      /प्रमाणित|सर्टिफ़ाइड|सर्टिफाइड/,
      /गारंटी/,
      /पूरे (भारत|देश)/,
      /लाख/,
      // approval by a regulator or the government
      /(सरकार|JKPCC|CPCB|प्रदूषण नियंत्रण|नगर निगम)[^।]{0,40}(मान्यता|अनुमति|अनुमोदित|मंज़ूरी)/,
      // the English claims scan's core patterns still apply to the mixed text
      /profitab|\bprofit\b|is legal|certified|guaranteed|nationwide/i,
      /\b(reloop|we) (is|are) (a |an )?(registered|licensed|authori[sz]ed|approved)\b/i,
    ];
    for (const path of [...HINDI_PAGES, "/shop"]) {
      await page.goto(path);
      const text = await page.locator("body").innerText();
      expect(text, path).toMatch(/[ऀ-ॿ]/);
      for (const re of banned) expect(text, `${re} found on ${path} (Hindi)`).not.toMatch(re);
    }
  });
});

test.describe("numbered steps", () => {
  const SHOP_STEPS = [
    "Sign up",
    "We verify your shop",
    "Submit your items",
    "Get an offer (you can say no)",
    "Pickup on your route day",
    "Get paid",
  ];

  for (const path of ["/sell", "/sell/shops"]) {
    test(`${path} shows the six shop steps and when each payment is made`, async ({ page }) => {
      await page.goto(path);
      const steps = page.getByRole("region", { name: "How selling works for shops" });
      const titles = steps.getByRole("listitem").getByRole("heading", { level: 3 });
      await expect(titles).toHaveCount(6);
      for (const [i, title] of SHOP_STEPS.entries())
        await expect(titles.nth(i)).toHaveAccessibleName(title);
      await expect(steps.getByText("On the spot, by UPI, weighed in front of you.")).toBeVisible();
      await expect(steps.getByText("After testing, at the offer you accepted.")).toBeVisible();
      await expect(steps.getByText("After testing, on our next visit.")).toBeVisible();
    });
  }

  test("/sell/institutions and /shop use the same numbered steps", async ({ page }) => {
    await page.goto("/sell/institutions");
    await expect(
      page.getByRole("region", { name: "How it works for institutions" }).getByRole("listitem"),
    ).toHaveCount(6);
    await page.goto("/shop");
    const buy = page.getByRole("region", { name: "How to buy" });
    await expect(buy.getByRole("listitem")).toHaveCount(5);
    await expect(buy.getByRole("heading", { name: "Reserve it" })).toBeVisible();
  });
});

test.describe("help on every page", () => {
  test("every public page has WhatsApp help and Report a problem", async ({ page, request }) => {
    test.setTimeout(240_000);
    const missing: string[] = [];
    for (const path of await publicPaths(request)) {
      await page.goto(path);
      const footer = page.getByRole("contentinfo");
      const wa = footer.getByRole("link", { name: /WhatsApp help/ });
      const report = footer.getByRole("link", { name: /Report a problem/ });
      if ((await wa.count()) !== 1 || (await report.count()) !== 1) missing.push(path);
      else expect(new URL((await wa.getAttribute("href"))!).host, path).toBe("wa.me");
    }
    expect(missing).toEqual([]);
  });
});

test.describe("item names instead of 'electronics'", () => {
  test("titles and the main buttons name phones, laptops and parts", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/phones, laptops/);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      /phones, laptops and parts/,
    );
    await page.goto("/shop");
    await expect(page).toHaveTitle(/Shop tested phones, laptops and parts/);
    for (const path of ["/", "/shop", "/sell", "/sell/shops", "/sell/institutions"]) {
      await page.goto(path);
      const text = await page.locator("body").innerText();
      expect(text, path).not.toMatch(/\belectronics\b/i);
    }
  });
});

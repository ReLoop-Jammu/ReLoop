import { expect, test } from "@playwright/test";
import { publicPaths } from "./paths";

/** Release gates that run without a database (section 8 of the handoff). */
test.describe("quality gates", () => {
  test("no broken internal links on any public page", async ({ page, request, isMobile }) => {
    test.skip(isMobile, "the links are the same on every screen size");
    test.setTimeout(240_000);
    const paths = await publicPaths(request);
    const seen = new Map<string, string>();
    for (const path of paths) {
      await page.goto(path);
      const hrefs = await page
        .locator("a[href^='/']")
        .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
      for (const h of hrefs) {
        const clean = h.split("#")[0];
        if (!clean || /^\/(hub|account|api)(\/|$)/.test(clean)) continue;
        if (!seen.has(clean)) seen.set(clean, path);
      }
    }
    const broken: string[] = [];
    for (const [href, from] of seen) {
      const res = await request.get(href, { maxRedirects: href.startsWith("/go/") ? 0 : 5 });
      const ok = href.startsWith("/go/")
        ? res.status() >= 300 && res.status() < 400
        : res.status() < 400;
      if (!ok) broken.push(`${href} (${res.status()}) linked from ${from}`);
    }
    expect(broken).toEqual([]);
    expect(seen.size).toBeGreaterThan(30);
  });

  test("every public page has a title and a description", async ({ page, request, isMobile }) => {
    test.skip(isMobile, "metadata is the same on every screen size");
    test.setTimeout(180_000);
    const missing: string[] = [];
    for (const path of await publicPaths(request)) {
      await page.goto(path);
      const title = await page.title();
      const desc = await page.locator('meta[name="description"]').getAttribute("content");
      if (!title || title.length < 5) missing.push(`${path}: title`);
      if (!desc || desc.length < 20) missing.push(`${path}: description`);
    }
    expect(missing).toEqual([]);
  });

  test("robots.txt and the sitemap keep the hub, accounts and sign-in pages out", async ({
    request,
  }) => {
    const robots = await (await request.get("/robots.txt")).text();
    for (const p of ["/hub", "/account", "/receipt"]) expect(robots).toContain(`Disallow: ${p}`);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toMatch(
      /<loc>[^<]*\/(hub|account|login|register|reset-password|forgot-password)\b/,
    );
  });

  for (const width of [360, 768, 1024, 1280]) {
    test(`no horizontal overflow at ${width} px`, async ({ page, request, isMobile }) => {
      test.skip(isMobile, "the desktop project sets each width itself");
      test.setTimeout(240_000);
      await page.setViewportSize({ width, height: 900 });
      const wide: string[] = [];
      for (const path of await publicPaths(request)) {
        await page.goto(path);
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        if (over > 1) wide.push(`${path} (+${over}px)`);
      }
      expect(wide).toEqual([]);
    });
  }

  test("shop pages carry no buy price, supplier or internal field, even in the page data", async ({
    request,
  }) => {
    const banned =
      /buy_paise|buyPaise|source_name|sourceName|source_phone|purchase_reference|purchasePaymentMethod|expected_resale|faults"|"rack"|staff_note|margin_paise|cogs/;
    for (const path of [
      "/",
      "/shop",
      "/shop?kind=parts",
      "/shop/RL-JMU-0001",
      "/shop/RL-JMU-0011",
      "/shop/compare?ids=RL-JMU-0001,RL-JMU-0002",
    ]) {
      const html = await (await request.get(path)).text();
      expect(html, path).not.toMatch(banned);
    }
  });
});

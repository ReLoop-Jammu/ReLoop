import { expect, test } from "@playwright/test";
import { openMobileMenu } from "./nav";
import { FOOTER_EXTRA, NAV_GROUPS } from "../../src/config/navigation";

const allLinks = NAV_GROUPS.flatMap((g) => g.links);

test.describe("navigation", () => {
  test("every menu page exists", async ({ request }) => {
    for (const l of [...allLinks, ...FOOTER_EXTRA.flatMap((g) => g.links)]) {
      expect((await request.get(l.href)).status(), l.href).toBe(200);
    }
  });

  test("the desktop menus and the mobile menu offer the same pages", async ({ page, isMobile }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    if (isMobile) await openMobileMenu(page);
    const hrefs = await nav
      .locator("a[href]")
      .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    expect([...new Set(hrefs)].sort()).toEqual(allLinks.map((l) => l.href).sort());
  });

  test("menu labels never wrap and the header never overflows", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop widths");
    for (const width of [1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      for (const g of NAV_GROUPS) {
        const button = page
          .getByRole("navigation", { name: "Main" })
          .getByRole("button", { name: g.label });
        const box = await button.boundingBox();
        expect(box!.height, `${g.label} at ${width}px`).toBeLessThanOrEqual(48);
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("a menu opens, closes with Escape and returns focus to its button", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "the desktop dropdowns");
    await page.goto("/");
    const button = page
      .getByRole("navigation", { name: "Main" })
      .getByRole("button", { name: "Sell" });
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();
  });

  test("the top bar and the header line up", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop widths");
    for (const width of [1024, 1280, 1600]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      const bar = await page
        .locator("body > div")
        .filter({ hasText: "Jammu pilot" })
        .locator("> div")
        .first()
        .boundingBox();
      const header = await page.locator("header > div").first().boundingBox();
      expect(Math.round(bar!.x), `left edge at ${width}px`).toBe(Math.round(header!.x));
      expect(Math.round(bar!.width), `width at ${width}px`).toBe(Math.round(header!.width));
    }
  });

  test("signed out: Log in is offered", async ({ page, isMobile }) => {
    await page.goto("/");
    if (isMobile) await openMobileMenu(page);
    await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
  });

  test("the footer lists every public page and a way to report a problem", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    for (const l of allLinks)
      await expect(footer.locator(`a[href="${l.href}"]`).first()).toBeAttached();
    const report = footer.getByRole("link", { name: /Report a problem/ });
    await expect(report).toHaveAttribute("href", /^https:\/\/wa\.me\/919871276179\?text=/);
  });
});

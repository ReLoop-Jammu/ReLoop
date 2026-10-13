import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/shop",
  "/shop?q=zzzz-nothing",
  "/shop/RL-JMU-0001",
  "/shop/RL-JMU-0008",
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
  "/locations/qr",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/resend-confirmation",
  "/hub",
  "/hub/intake",
  "/hub/items",
  "/hub/partners",
  "/hub/handovers",
  "/hub/data",
  "/hub/shops",
  "/hub/users",
  "/hub/requests",
  "/hub/submissions",
  "/account/change-password",
  "/this-page-does-not-exist",
];

// WCAG 2.2 AA is the standard set in docs/engineering-standards.md.
for (const path of PAGES) {
  test(`no accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    // Let entrance animations finish so colour contrast is measured at rest.
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
    }));
    expect(summary).toEqual([]);
  });
}

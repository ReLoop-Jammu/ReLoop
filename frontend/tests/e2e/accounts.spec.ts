import { expect, test } from "@playwright/test";

const UNKNOWN = "0".repeat(64);

test.describe("request status links", () => {
  test("an unknown link says so, without guessing, and isn't indexed", async ({ page }) => {
    await page.goto(`/status/${UNKNOWN}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "We couldn't find this request" }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  });

  test("a malformed link is handled the same way", async ({ page }) => {
    await page.goto("/status/not-a-real-link");
    await expect(
      page.getByRole("heading", { level: 1, name: "We couldn't find this request" }),
    ).toBeVisible();
  });
});

test.describe("account pages ask visitors to log in and come back", () => {
  for (const path of ["/account/requests", "/account/notifications", "/account/settings"]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}$`));
    });
  }
});

test("the account deletion screen is for admins", async ({ page }) => {
  await page.goto("/hub/deletions");
  await expect(page.getByRole("heading", { name: "Log in to continue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Account deletions" })).toHaveCount(0);
});

test("the privacy page explains deletion, status links and notifications", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByText(/An admin carries out the request within 30 days/)).toBeVisible();
  await expect(page.getByText(/private status link/)).toBeVisible();
  await expect(
    page.getByText("Notifications on the site are deleted after 90 days."),
  ).toBeVisible();
});

test.describe("warranty", () => {
  test("the warranty page sets out the terms and how to claim", async ({ page }) => {
    await page.goto("/warranty");
    await expect(page.getByText(/Not covered: physical or liquid damage/)).toBeVisible();
    await expect(page.getByText(/a repair first, then a replacement/)).toBeVisible();
    await expect(
      page.getByText(/We don't take returns because you changed your mind/),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Warranty claims" })).toHaveAttribute(
      "href",
      "/account/warranty",
    );
  });

  test("the claims pages ask visitors to log in", async ({ page }) => {
    await page.goto("/account/warranty");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fwarranty$/);
    await page.goto("/hub/warranty");
    await expect(page.getByText("Warranty claims are kept in the shared database.")).toBeVisible();
  });
});

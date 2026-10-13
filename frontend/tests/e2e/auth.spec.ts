import { expect, test } from "@playwright/test";

// These run without Supabase, which is also how a fresh checkout behaves.

test.describe("accounts and public endpoints", () => {
  test("a signed-out visitor is reported as such", async ({ request }) => {
    const res = await request.get("/api/auth/session");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ authenticated: false });
    expect(res.headers()["cache-control"]).toContain("no-store");
  });

  test("login explains calmly when sign-in isn't connected", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("someone@example.com");
    await page.getByLabel("Password").fill("a-long-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("alert")).toContainText(/isn't available yet/i);
  });

  test("the account page sends signed-out visitors to log in", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
  });

  test("login ignores a next link that leaves the site", async ({ page }) => {
    await page.goto("/login?next=https://evil.example");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Log in to ReLoop");
    await expect(page).toHaveURL(/\/login/);
  });

  for (const path of [
    "/api/institution-submissions",
    "/api/shop-submissions",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
  ]) {
    test(`${path} refuses requests that don't come from this site`, async ({ request }) => {
      const res = await request.post(path, { data: {} });
      expect(res.status()).toBe(403);
    });
  }

  test("tokens are never kept in browser storage", async ({ page }) => {
    await page.goto("/login");
    const stored = await page.evaluate(() => Object.keys(window.localStorage));
    expect(stored.filter((k) => k.includes("auth") || k.includes("token"))).toEqual([]);
  });
});

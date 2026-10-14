import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "ReLoop-demo-2026";

/** Logs in through the real login form as one of the demo accounts. */
export async function loginAs(page: Page, email: string, next = "/account") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[/?]/g, "\\$&")), { timeout: 20_000 });
}

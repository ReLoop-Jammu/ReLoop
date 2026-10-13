import { expect, test } from "@playwright/test";

test.describe("account recovery", () => {
  test("login links to password reset and the confirmation email", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await page.goto("/login");
    await page.getByRole("link", { name: "Didn't get the confirmation email?" }).click();
    await expect(
      page.getByRole("heading", { name: "Resend the confirmation email" }),
    ).toBeVisible();
  });

  test("the reset page needs a link from the email", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText("Open this page from the reset link in your email.")).toBeVisible();
    await expect(page.getByLabel("New password")).toHaveCount(0);
  });

  test("an expired link says so and offers a new one", async ({ page }) => {
    await page.goto("/reset-password#error=access_denied&error_code=otp_expired");
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      /expired or was already used/,
    );
    await expect(page.getByRole("link", { name: "Ask for a new reset link" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  test("a recovery link shows the form and checks both passwords match", async ({ page }) => {
    await page.goto("/reset-password#access_token=t&refresh_token=r&expires_in=3600&type=recovery");
    await page.getByLabel("New password").fill("a-good-password");
    await page.getByLabel("Type it again").fill("a-different-one");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "The two passwords don't match.",
    );
  });
});

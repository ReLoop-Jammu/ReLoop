import { expect, test } from "@playwright/test";

test.describe("account recovery", () => {
  test("login links to password help, and no longer to the confirmation email", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /confirmation email/i })).toHaveCount(0);
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  });

  test("forgot password explains the admin reset and shows the support contacts", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    const main = page.getByRole("main");
    await expect(
      main.getByText(
        "Message us on WhatsApp or email; after we confirm it's you, an admin resets your password.",
      ),
    ).toBeVisible();
    await expect(main.getByRole("link", { name: /WhatsApp \+91 98712 76179/ })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/919871276179\?text=/,
    );
    await expect(main.getByRole("link", { name: /@gmail\.com$/ })).toHaveAttribute(
      "href",
      /^mailto:/,
    );
    await expect(main.getByLabel("Email address")).toHaveCount(0);
  });

  test("the resend-confirmation page still exists, but nothing links to it", async ({ page }) => {
    await page.goto("/resend-confirmation");
    await expect(
      page.getByRole("heading", { name: "Resend the confirmation email" }),
    ).toBeVisible();
    for (const path of ["/", "/login", "/register", "/forgot-password"]) {
      await page.goto(path);
      await expect(page.locator('a[href="/resend-confirmation"]')).toHaveCount(0);
    }
  });

  test("changing your password asks you to log in first", async ({ page }) => {
    await page.goto("/account/change-password");
    await expect(page.getByRole("link", { name: "Log in first" })).toHaveAttribute(
      "href",
      "/login?next=%2Faccount%2Fchange-password",
    );
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

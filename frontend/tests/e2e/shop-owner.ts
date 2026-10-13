import type { Page, Request } from "@playwright/test";

/**
 * Signs the page in as a shop owner by seeding the session that
 * src/lib/auth-client.ts keeps in localStorage. The token is fake: CI has no
 * Supabase, so the submissions API is stood in for with mockShopSubmissions.
 */
export async function signInAsShopOwner(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "reloop-auth-session",
      JSON.stringify({
        access_token: "e2e-access-token",
        refresh_token: "e2e-refresh-token",
        user: { id: "00000000-0000-4000-8000-0000000000e2", email: "shop@e2e.test" },
      }),
    );
  });
}

/**
 * Answers POST /api/shop-submissions like the server route would, and records
 * each request so the test can check what the form sent.
 */
export async function mockShopSubmissions(
  page: Page,
  reply: { status: number; body: Record<string, unknown> } = {
    status: 200,
    body: { ok: true },
  },
) {
  const requests: Request[] = [];
  await page.route("**/api/shop-submissions", async (route) => {
    requests.push(route.request());
    const items = (route.request().postDataJSON() as { items?: unknown[] }).items ?? [];
    const body = reply.status === 200 ? { ...reply.body, count: items.length } : reply.body;
    await route.fulfill({ status: reply.status, json: body });
  });
  return requests;
}

/** Fills the shop details and one item per name, adding item rows as needed. */
export async function fillShopSubmission(page: Page, itemNames: string[]) {
  await page.getByLabel("Shop name").fill("Sharma Mobiles");
  await page.getByLabel("Your name").fill("Ravi Sharma");
  await page.getByLabel("Phone / WhatsApp").fill("98765 43210");
  for (const [i, name] of itemNames.entries()) {
    if (i > 0) await page.getByRole("button", { name: "Add item" }).click();
    await page.getByLabel("Item name").nth(i).fill(name);
    await page.getByLabel("Condition").nth(i).selectOption("Broken");
    await page.getByLabel("Quantity").nth(i).fill("2");
  }
}

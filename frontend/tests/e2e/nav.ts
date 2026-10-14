import { expect, type Page } from "@playwright/test";

/** Opens a header group (dropdown on desktop, accordion in the mobile menu) and clicks one of its links. */
export async function goViaMenu(page: Page, isMobile: boolean, group: string, link: string) {
  const nav = page.getByRole("navigation", { name: "Main" });
  if (isMobile) {
    await openMobileMenu(page);
    const details = nav
      .locator("details")
      .filter({ has: page.locator("summary", { hasText: group }) });
    if (!(await details.evaluate((d) => (d as HTMLDetailsElement).open)))
      await details.locator("summary").click();
    await details.getByRole("link", { name: link, exact: true }).click();
  } else {
    await openMenuButton(nav.getByRole("button", { name: group, exact: true }));
    // Desktop menu links also carry a description, so match the start of the name.
    await nav.getByRole("link", { name: new RegExp(`^${escape(link)}`) }).click();
  }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Clicks a menu button until it reports open (menus work only once the page is hydrated). */
async function openMenuButton(button: ReturnType<Page["getByRole"]>) {
  await expect(async () => {
    if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
}

export async function openMobileMenu(page: Page) {
  await openMenuButton(page.getByRole("button", { name: /^(Open|Close) menu$/ }));
}

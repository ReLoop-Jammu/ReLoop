import type { MetadataRoute } from "next";
import { allNavLinks, FOOTER_EXTRA } from "@/config/navigation";
import { getAllShopIds } from "@/features/shop/queries";
import { env } from "@/lib/env";

// Every page in the site's menus (config/navigation.ts), plus the home page
// and the legal pages; account, login and hub pages are left out on purpose.
const PAGES = [
  "",
  ...new Set([...allNavLinks(), ...FOOTER_EXTRA.flatMap((g) => g.links)].map((l) => l.href)),
].filter((p) => !["/login", "/register"].includes(p));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const pages = PAGES.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  const items = (await getAllShopIds()).map((id) => ({
    url: `${base}/shop/${id}`,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));
  return [...pages, ...items];
}

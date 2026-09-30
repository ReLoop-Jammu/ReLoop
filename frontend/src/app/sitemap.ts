import type { MetadataRoute } from "next";
import { getAllListingSlugs } from "@/features/listings/queries";
import { env } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const pages = ["", "/listings", "/how-it-works", "/impact", "/sell"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  const listings = (await getAllListingSlugs()).map((slug) => ({
    url: `${base}/listings/${slug}`,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));
  return [...pages, ...listings];
}

import type { MetadataRoute } from "next";
import { getAllShopIds } from "@/features/shop/queries";
import { env } from "@/lib/env";

const PAGES = [
  "",
  "/shop",
  "/sell",
  "/sell/shops",
  "/sell/institutions",
  "/sell/home",
  "/sell/consignment",
  "/how-it-works",
  "/where-scrap-goes",
  "/warranty",
  "/impact",
  "/contact",
  "/privacy",
  "/terms",
];

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

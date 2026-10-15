import type { APIRequestContext } from "@playwright/test";
import { FOOTER_EXTRA, allNavLinks } from "../../src/config/navigation";

/** Every public page: the menus and footer (one config) plus the sitemap and the pages linked from neither. */
export async function publicPaths(request: APIRequestContext) {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const fromSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
  return [
    ...new Set([
      "/",
      "/register",
      "/login",
      "/privacy",
      "/terms",
      ...allNavLinks().map((l) => l.href),
      ...FOOTER_EXTRA.flatMap((g) => g.links.map((l) => l.href)),
      ...fromSitemap,
    ]),
  ].filter(
    (p) =>
      !/^\/(account|hub|admin)/.test(p) &&
      !p.startsWith("/print") &&
      !p.startsWith("/locations/qr"),
  );
}

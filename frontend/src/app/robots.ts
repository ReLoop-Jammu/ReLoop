import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { IS_SIMULATION } from "@/lib/environment";

export default function robots(): MetadataRoute.Robots {
  // The simulation site holds generated data: keep every crawler out.
  if (IS_SIMULATION) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/admin", "/hub"] },
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}

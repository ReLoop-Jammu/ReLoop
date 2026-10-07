import { z } from "zod";

/**
 * Validated environment. Import `env` instead of reading `process.env`
 * directly, so a missing or malformed variable fails loudly at startup.
 * Supabase keys are added here when the project is connected.
 */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  /**
   * "on" once Web Analytics and Speed Insights are enabled in the Vercel
   * dashboard. Their scripts only exist then; loading them earlier logs a
   * 404 in every visitor's console.
   */
  VERCEL_ANALYTICS: z.enum(["on", "off"]).default("off"),
});

// On Vercel, fall back to the project's production domain if no URL is set.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const env = schema.parse({
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000"),
  VERCEL_ANALYTICS: process.env.VERCEL_ANALYTICS || undefined,
});

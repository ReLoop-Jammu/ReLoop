import "server-only";

import { DEFAULT_SETTINGS, mergeSettings, type SiteSettings } from "./defaults";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * The public settings (contact details, hours, lists), refreshed at most every
 * minute. Without a database, or if it can't be reached, the defaults.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!URL_ || !KEY) return DEFAULT_SETTINGS;
  try {
    const r = await fetch(`${URL_}/rest/v1/public_settings?select=key,value`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      next: { revalidate: 60, tags: ["settings"] },
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return DEFAULT_SETTINGS;
    return mergeSettings((await r.json()) as { key: string; value: unknown }[]);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

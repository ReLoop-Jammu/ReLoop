import "server-only";

import type { PassportRow } from "./stages";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isItemTag = (id: string) => /^RL-[A-Z]{3}-\d{4,}$/.test(id);

/**
 * An item's public journey (item_passport, as a visitor), refreshed at most
 * every 5 minutes. Empty for unknown or hidden items, without a database (CI)
 * or on any error.
 */
export async function getPassport(id: string): Promise<PassportRow[]> {
  if (!isItemTag(id) || !SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/item_passport?select=item_id,category,part_type,stage,at&item_id=eq.${encodeURIComponent(id)}&order=at`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(4000),
      },
    );
    return r.ok ? ((await r.json()) as PassportRow[]) : [];
  } catch {
    return [];
  }
}

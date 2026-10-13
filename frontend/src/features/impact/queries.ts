import "server-only";

import { parseImpactRow, type ImpactTotals } from "./totals";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * The three public totals from the impact_totals view (refreshed at most every
 * 5 minutes). Returns null without Supabase (CI) or on any error, so the home
 * page falls back to the pilot message instead of breaking.
 */
export async function getImpactTotals(): Promise<ImpactTotals | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/impact_totals?select=items_reused,kg_recycled,active_partner_shops`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as Parameters<typeof parseImpactRow>[0][];
    return parseImpactRow(rows[0]);
  } catch {
    return null;
  }
}

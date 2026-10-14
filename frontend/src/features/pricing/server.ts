import "server-only";

import type { PriceBand, PricePoint } from "./bands";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function read<T>(path: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    return r.ok ? ((await r.json()) as T[]) : [];
  } catch {
    return [];
  }
}

/** The fair-price band and price new of a listed hub item (null for samples, unknown items or without a database). */
export async function getPriceBand(id: string): Promise<PriceBand | null> {
  const rows = await read<PriceBand>(`public_price_bands?item_id=eq.${encodeURIComponent(id)}`);
  return rows[0] ?? null;
}

export async function getPriceHistory(id: string): Promise<PricePoint[]> {
  return read<PricePoint>(
    `public_price_history?select=at,price_paise&item_id=eq.${encodeURIComponent(id)}&order=at`,
  );
}

import "server-only";
import type { PartnerShop } from "@/config/locations";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type Row = { name: string; market: string; lat: number; lng: number; approximate: boolean };

/** Map rows as the locations page shows them (exported for tests). */
export const toPartnerShop = (r: Row): PartnerShop => ({
  name: r.name,
  market: r.market,
  lat: r.lat,
  lng: r.lng,
  approximate: r.approximate,
  description: r.approximate ? "Position approximate." : "",
  agreedToBeShown: true,
});

/**
 * Verified shops an admin put on the map with the shop's consent, from the
 * public map_partner_shops view (name, market and position only). Refreshed
 * every 5 minutes; without Supabase (local dev, CI) the list is empty.
 */
export async function mapPartnerShops(): Promise<PartnerShop[]> {
  if (!URL_ || !KEY) return [];
  try {
    const response = await fetch(
      `${URL_}/rest/v1/map_partner_shops?select=name,market,lat,lng,approximate&order=name.asc`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, next: { revalidate: 300 } },
    );
    if (!response.ok) return [];
    return ((await response.json()) as Row[]).map(toPartnerShop);
  } catch {
    return [];
  }
}

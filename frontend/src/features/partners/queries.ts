import "server-only";

export type DirectoryEntry = {
  name: string;
  market: string | null;
  type: string;
  partner_since: string;
  kg_band: "under 25 kg" | "25-100 kg" | "100+ kg";
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Consenting partner shops from the partner_directory view; null without Supabase or on any error. */
export async function getPartnerDirectory(): Promise<DirectoryEntry[] | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/partner_directory?select=name,market,type,partner_since,kg_band&order=market,name`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(3000),
      },
    );
    return r.ok ? ((await r.json()) as DirectoryEntry[]) : null;
  } catch {
    return null;
  }
}

/** Entries grouped by market, markets in name order, "Other" last. */
export function byMarket(entries: readonly DirectoryEntry[]) {
  const m = new Map<string, DirectoryEntry[]>();
  for (const e of entries) m.set(e.market ?? "Other", [...(m.get(e.market ?? "Other") ?? []), e]);
  return [...m.entries()].sort(([a], [b]) =>
    a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b),
  );
}

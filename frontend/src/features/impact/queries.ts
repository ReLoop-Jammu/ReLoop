import "server-only";

import { parseImpactRow, type ImpactTotals } from "./totals";

type KpiRow = {
  devices_resold: number | string;
  parts_sold: number | string;
  kg_to_vrrg: number | string;
  partner_repair_shops: number | string;
  partner_retailers: number | string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * The three public totals from the public_kpis view: counts and kg only, from
 * weighed records (refreshed at most every 5 minutes). Returns null without Supabase (CI) or on any error, so the home
 * page falls back to the pilot message instead of breaking.
 */
export async function getImpactTotals(): Promise<ImpactTotals | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/public_kpis?select=devices_resold,parts_sold,kg_to_vrrg,partner_repair_shops,partner_retailers`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as KpiRow[];
    const r = rows[0];
    return parseImpactRow(
      r && {
        items_reused: Number(r.devices_resold) + Number(r.parts_sold),
        kg_recycled: r.kg_to_vrrg,
        active_partner_shops: Number(r.partner_repair_shops) + Number(r.partner_retailers),
      },
    );
  } catch {
    return null;
  }
}

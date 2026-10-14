import "server-only";

import type { RequestStage } from "./stages";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isStatusToken = (t: string) => /^[0-9a-f]{64}$/.test(t);

/**
 * One request's stage by its private link, as a visitor (request_status()).
 * Never cached: the page must show the latest stage. Null when the link is
 * unknown, there is no database (CI) or the lookup fails.
 */
export async function getRequestStatus(token: string): Promise<RequestStage | null> {
  if (!isStatusToken(token) || !SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/request_status`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_token: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const rows = (await r.json()) as RequestStage[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

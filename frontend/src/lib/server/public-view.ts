import "server-only";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Reads a public view as a visitor (the publishable key), cached for five
 * minutes. Returns null without Supabase (CI) or on any error, so pages show
 * their "pilot starting" state instead of breaking.
 */
export async function publicView<T>(view: string, query: string): Promise<T[] | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${view}?${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    return r.ok ? ((await r.json()) as T[]) : null;
  } catch {
    return null;
  }
}

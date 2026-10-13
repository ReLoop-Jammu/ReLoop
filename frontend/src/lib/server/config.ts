import "server-only";

/**
 * Supabase settings for server code. Names follow docs/team-setup.md:
 *  - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: public
 *  - SUPABASE_SERVICE_ROLE_KEY: server-only, bypasses Row Level Security
 * (SUPABASE_URL and SUPABASE_SECRET_KEY are accepted as aliases.)
 */
export type SupabaseConfig = {
  url: string;
  publishableKey: string | null;
  serviceKey: string | null;
};

export function supabaseConfig(): SupabaseConfig | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (!url) return null;

  return {
    url,
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      null,
    serviceKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim() || null,
  };
}

/** Shown to visitors when the project is not connected yet. Never names a variable. */
export const NOT_CONFIGURED = "This feature isn't available yet. Please contact ReLoop.";

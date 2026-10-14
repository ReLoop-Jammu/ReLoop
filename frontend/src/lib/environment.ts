/**
 * Which ReLoop this build is: the real site, or the simulation (demo and
 * preview deployments, seeded from the business plan's assumptions by
 * backend/sim/seed.mjs). Set NEXT_PUBLIC_RELOOP_ENV=simulation for those.
 */
export const IS_SIMULATION = process.env.NEXT_PUBLIC_RELOOP_ENV === "simulation";

/** Supabase project refs (public: they appear in every page's API calls). */
export const LIVE_PROJECT_REF = "cwhujrkvqmmhazntduns";
export const SIM_PROJECT_REF = "fskpgbbsvcwhqogjkezj";

/** Demo logins keep their shared password on the simulation site (see /demo). */
export const isDemoAccount = (email: string | undefined | null) =>
  IS_SIMULATION && Boolean(email?.toLowerCase().endsWith("@reloop.demo"));

/**
 * Stops a build that mixes the two: a simulation build pointing at the live
 * database, or a real build pointing at the simulation one. Checks every
 * Supabase URL the app uses (the browser's and the server's).
 */
export function assertEnvironment(
  simulation = IS_SIMULATION,
  urls = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL],
) {
  for (const url of urls.filter(Boolean) as string[]) {
    if (simulation && url.includes(LIVE_PROJECT_REF)) {
      throw new Error(
        "NEXT_PUBLIC_RELOOP_ENV=simulation must never use the live Supabase project.",
      );
    }
    if (!simulation && url.includes(SIM_PROJECT_REF)) {
      throw new Error(
        "This build uses the simulation database: set NEXT_PUBLIC_RELOOP_ENV=simulation.",
      );
    }
  }
}

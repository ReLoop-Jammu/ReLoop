import { revalidateTag } from "next/cache";
import { bearer, callerIsAdmin, reply } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

/**
 * After an admin saves settings: drop the cached copy, so the next visit to
 * any page reads the new values instead of waiting out the one-minute cache.
 */
export async function POST(request: Request) {
  // No service key needed: the database answers is_admin() for the caller's own token.
  const token = bearer(request);
  if (!token) return reply({ error: "Please log in again." }, 401);
  const admin = await callerIsAdmin(token).catch(() => null);
  if (admin === null) return reply({ error: "Couldn't check your access." }, 503);
  if (!admin) return reply({ error: "Admins only." }, 403);
  revalidateTag("settings", { expire: 0 });
  return reply({ ok: true });
}

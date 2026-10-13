import "server-only";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";
import { ACCESS_COOKIE, fetchUser, userRest } from "./session";

export type HubAccess = "ok" | "login" | "forbidden" | "unavailable";

/**
 * Who may open /hub. Staff only: a signed-in user who is listed in
 * public.staff. Without a Supabase project the hub stays locked, unless
 * INSECURE_OPEN_HUB=true is set (local development and the browser tests only;
 * never set it on a deployed site).
 */
export async function checkHubAccess(): Promise<HubAccess> {
  if (process.env.INSECURE_OPEN_HUB === "true") return "ok";
  if (!supabaseConfig()) return "unavailable";

  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) return "login";

  const user = await fetchUser(access);
  if (!user) return "login";

  const rows = await userRest<Array<{ user_id: string }>>(access, "staff?select=user_id&limit=1");
  if (rows === null) return "unavailable";
  return rows.length > 0 ? "ok" : "forbidden";
}

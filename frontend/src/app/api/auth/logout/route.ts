import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/server/config";
import { isSameOrigin, jsonError, noStore } from "@/lib/server/http";
import { ACCESS_COOKIE, clearSessionCookies } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Request not allowed.", 403);

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const config = supabaseConfig();

  // Revoke the session at Supabase when we can; always clear our cookies.
  if (access && config?.publishableKey) {
    await fetch(`${config.url}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${access}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }).catch(() => undefined);
  }

  const result = NextResponse.json({ ok: true }, { headers: noStore });
  clearSessionCookies(result);
  return result;
}

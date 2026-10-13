import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { NOT_CONFIGURED, supabaseConfig } from "@/lib/server/config";
import { isSameOrigin, jsonError, noStore, readJson } from "@/lib/server/http";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { applySessionCookies, parseTokenResponse } from "@/lib/server/session";
import { email, firstIssue } from "@/lib/validation";

export const runtime = "nodejs";

const schema = z.object({ email, password: z.string().min(1, "Password is required.").max(128) });

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Request not allowed.", 403);

  const config = supabaseConfig();
  if (!config?.publishableKey) return jsonError(NOT_CONFIGURED, 503);

  const body = await readJson(request, 4_000);
  if (!body.ok) return body.response;

  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);
  const { email: address, password } = parsed.data;

  const allowed =
    (await withinRateLimit(request, "login-ip", 20, 15 * 60)) &&
    (await withinRateLimit(request, "login-email", 8, 15 * 60, address));
  if (!allowed) return jsonError("Too many attempts. Please wait a few minutes and try again.", 429);

  let response: Response;
  try {
    response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: address, password }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return jsonError("Could not reach the sign-in service. Please try again.", 502);
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const code = typeof data.error_code === "string" ? data.error_code : "";
    if (code === "email_not_confirmed") {
      return jsonError("Please confirm your email address first. Check your inbox for the link.", 401);
    }
    if (response.status >= 500) return jsonError("Sign-in is unavailable right now. Please try again.", 502);
    return jsonError("Incorrect email or password.", 401);
  }

  const session = parseTokenResponse(data);
  if (!session) return jsonError("Sign-in could not be completed. Please try again.", 502);

  const result = NextResponse.json({ ok: true }, { headers: noStore });
  applySessionCookies(result, session.tokens);
  return result;
}

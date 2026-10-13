import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { NOT_CONFIGURED, supabaseConfig } from "@/lib/server/config";
import { isSameOrigin, jsonError, jsonOk, noStore, readJson } from "@/lib/server/http";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { applySessionCookies, parseTokenResponse } from "@/lib/server/session";
import {
  email,
  firstIssue,
  gstin,
  longText,
  password,
  phone,
  text,
} from "@/lib/validation";

export const runtime = "nodejs";

const base = {
  email,
  password,
  fullName: text(2, 100, "Full name"),
  phone,
  website: z.string().optional(),
};

const schema = z.discriminatedUnion("role", [
  z.object({ ...base, role: z.literal("buyer") }),
  z.object({
    ...base,
    role: z.literal("shop_owner"),
    shopName: text(2, 120, "Shop name"),
    gstin,
    businessAddress: longText(300, "Business address").pipe(
      z.string().min(5, "Enter your business address."),
    ),
  }),
]);

const CHECK_EMAIL =
  "Check your email to confirm your address, then log in. If nothing arrives, check your spam folder.";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Request not allowed.", 403);

  const config = supabaseConfig();
  if (!config?.publishableKey) return jsonError(NOT_CONFIGURED, 503);

  const body = await readJson(request, 8_000);
  if (!body.ok) return body.response;

  // Hidden field that only bots fill in: pretend it worked.
  if (typeof body.data.website === "string" && body.data.website.trim()) {
    return jsonOk({ session: false, message: CHECK_EMAIL });
  }

  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);
  const input = parsed.data;

  if (!(await withinRateLimit(request, "register-ip", 6, 60 * 60))) {
    return jsonError("Too many sign-ups from this connection. Please try again later.", 429);
  }

  const metadata =
    input.role === "shop_owner"
      ? {
          full_name: input.fullName,
          phone: input.phone,
          account_type: input.role,
          shop_name: input.shopName,
          gstin: input.gstin,
          business_address: input.businessAddress,
        }
      : { full_name: input.fullName, phone: input.phone, account_type: input.role };

  let response: Response;
  try {
    response = await fetch(`${config.url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email, password: input.password, data: metadata }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return jsonError("Could not reach the sign-up service. Please try again.", 502);
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const code = typeof data.error_code === "string" ? data.error_code : "";
    if (code === "weak_password") {
      return jsonError("That password is too easy to guess. Try a longer or less common one.", 400);
    }
    if (code === "over_email_send_rate_limit" || response.status === 429) {
      return jsonError("Too many sign-ups right now. Please try again in a little while.", 429);
    }
    // Do not reveal whether an address is already registered.
    if (code === "user_already_exists") return jsonOk({ session: false, message: CHECK_EMAIL });
    console.error("Sign-up failed:", response.status, code);
    return jsonError("We couldn't create your account. Please try again.", 502);
  }

  // With email confirmation off, Supabase returns a session straight away.
  const session = parseTokenResponse(data);
  if (session) {
    const result = NextResponse.json(
      { ok: true, session: true, message: "Account created." },
      { headers: noStore },
    );
    applySessionCookies(result, session.tokens);
    return result;
  }

  // Same reply whether the address is new or already registered.
  return jsonOk({ session: false, message: CHECK_EMAIL });
}

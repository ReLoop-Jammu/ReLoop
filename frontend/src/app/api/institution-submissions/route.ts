import { z } from "zod";
import { NOT_CONFIGURED, supabaseConfig } from "@/lib/server/config";
import { isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/server/http";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { email, firstIssue, longText, optionalText, phone, text } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Public booking form. Anyone can reach it, so it is deliberately narrow:
 * same-origin only, a honeypot, rate limits, a small body, a fixed set of
 * fields (nothing else is stored) and a database size cap behind that.
 */
const schema = z.object({
  institutionName: text(2, 200, "Institution name"),
  contactName: text(2, 150, "Contact person"),
  phone,
  email: z
    .union([z.literal(""), z.null(), z.undefined(), email])
    .transform((v) => (v ? v : null)),
  details: z
    .object({
      type: optionalText(80, "Institution type"),
      preferredDate: optionalText(40, "Preferred date"),
      lotDescription: longText(800, "Lot description"),
    })
    .optional()
    .transform((v) => v ?? { type: "", preferredDate: "", lotDescription: "" }),
  website: z.string().optional(),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Request not allowed.", 403);

  const config = supabaseConfig();
  if (!config?.serviceKey) return jsonError(NOT_CONFIGURED, 503);

  const body = await readJson(request, 16_000);
  if (!body.ok) return body.response;

  // Hidden field that only bots fill in: pretend it worked.
  if (typeof body.data.website === "string" && body.data.website.trim()) return jsonOk();

  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);
  const data = parsed.data;

  const allowed =
    (await withinRateLimit(request, "institution-ip", 5, 60 * 60)) &&
    (await withinRateLimit(request, "institution-all", 300, 24 * 60 * 60, "everyone"));
  if (!allowed) {
    return jsonError("Too many requests from this connection. Please try again later.", 429);
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/institution_submissions`, {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        institution_name: data.institutionName,
        contact_name: data.contactName,
        phone: data.phone,
        email: data.email,
        details: data.details,
        status: "Pending",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error("Institution submission failed:", response.status, await response.text());
      return jsonError("We couldn't save your booking. Please try again or contact ReLoop.", 502);
    }
  } catch (error) {
    console.error("Institution submission error:", error);
    return jsonError("A connection error occurred. Please try again.", 502);
  }

  return jsonOk({ message: "Your institution pickup request has been saved." });
}

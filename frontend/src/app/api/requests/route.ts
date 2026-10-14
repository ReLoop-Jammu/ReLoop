import { cleanRequest } from "@/features/sell/requests";
import { bearer, isConfigured, reply, serviceRest, checkToken } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

/**
 * Saves a public request (reservation, enquiry or institution pickup) for hub
 * staff. Only staff can read requests; visitors can't insert them directly.
 * A signed-in sender's request is linked to their account; an expired session
 * is refused rather than saved under the wrong person. The reply carries the
 * request's private status link token. The visitor's WhatsApp/email handoff
 * happens in the browser either way.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  // Honeypot: real visitors never fill this hidden field.
  if (body && typeof body.website === "string" && body.website.trim()) return reply({ ok: true });
  const clean = cleanRequest(body);
  if ("error" in clean) return reply({ error: clean.error }, 400);
  if (!isConfigured()) return reply({ error: "Requests can't be saved right now." }, 503);
  try {
    // An expired session is refused (the browser then sends it without one);
    // if the auth service is down, the request is saved without the link.
    const token = bearer(request);
    const checked = token ? await checkToken(token) : null;
    if (checked === "invalid") return reply({ error: "Please log in again." }, 401);
    const buyer = checked && checked !== "unavailable" ? checked : null;
    if (clean.itemId) {
      const item = await serviceRest<{ status: string }[]>(
        `items?select=status&id=eq.${encodeURIComponent(clean.itemId)}`,
      );
      if (item[0]?.status !== "listed" && item[0]?.status !== "reserved") {
        return reply({ error: "That item is no longer available." }, 409);
      }
    }
    const saved = await serviceRest<{ status_token: string }[]>("submissions?select=status_token", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        kind: clean.kind,
        fields: clean.fields,
        item_id: clean.itemId,
        buyer_id: buyer?.id ?? null,
      }),
    });
    return reply({ ok: true, statusToken: saved[0]?.status_token ?? null, linked: Boolean(buyer) });
  } catch {
    return reply({ error: "We couldn't save your request." }, 502);
  }
}

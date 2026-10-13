import { cleanRequest } from "@/features/sell/requests";
import { isConfigured, reply, serviceRest } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

/**
 * Saves a public request (reservation, enquiry or institution pickup) for hub
 * staff. Only staff can read requests; visitors can't insert them directly.
 * The visitor's WhatsApp/email handoff happens in the browser either way.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  // Honeypot: real visitors never fill this hidden field.
  if (body && typeof body.website === "string" && body.website.trim()) return reply({ ok: true });
  const clean = cleanRequest(body);
  if ("error" in clean) return reply({ error: clean.error }, 400);
  if (!isConfigured()) return reply({ error: "Requests can't be saved right now." }, 503);
  try {
    if (clean.itemId) {
      const item = await serviceRest<{ status: string }[]>(
        `items?select=status&id=eq.${encodeURIComponent(clean.itemId)}`,
      );
      if (item[0]?.status !== "listed" && item[0]?.status !== "reserved") {
        return reply({ error: "That item is no longer available." }, 409);
      }
    }
    await serviceRest("submissions", {
      method: "POST",
      body: JSON.stringify({ kind: clean.kind, fields: clean.fields, item_id: clean.itemId }),
    });
    return reply({ ok: true });
  } catch {
    return reply({ error: "We couldn't save your request." }, 502);
  }
}

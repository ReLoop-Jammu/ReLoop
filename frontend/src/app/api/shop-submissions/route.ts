import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { NOT_CONFIGURED, supabaseConfig } from "@/lib/server/config";
import { isSameOrigin, jsonError, jsonOk, noStore, readJson } from "@/lib/server/http";
import { withinRateLimit } from "@/lib/server/rate-limit";
import { applySessionCookies, getActiveSession, userRest } from "@/lib/server/session";
import {
  SHOP_CONDITIONS,
  firstIssue,
  isSafeImageUrl,
  longText,
  optionalText,
  text,
} from "@/lib/validation";

export const runtime = "nodejs";

const item = z.object({
  itemName: text(1, 120, "Item name"),
  category: optionalText(80, "Category"),
  brand: optionalText(100, "Brand"),
  model: optionalText(100, "Model"),
  condition: z.enum(SHOP_CONDITIONS, { error: "Choose a condition for every item." }),
  quantity: z.coerce
    .number({ error: "Quantity must be a number." })
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(100_000, "Quantity is too large."),
  askingPrice: z
    .union([z.literal(""), z.null(), z.undefined(), z.coerce.number().min(0).max(100_000_000)])
    .transform((v) => (v === "" || v == null ? null : v)),
  imageUrl: optionalText(1000, "Photo link").refine(
    (v) => v === "" || isSafeImageUrl(v),
    "Photo links must be public https addresses.",
  ),
  description: longText(800, "Details"),
});

const schema = z.object({
  items: z.array(item).min(1, "Add at least one item.").max(10, "Submit up to 10 items at a time."),
  website: z.string().optional(),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Request not allowed.", 403);

  const config = supabaseConfig();
  if (!config?.serviceKey) return jsonError(NOT_CONFIGURED, 503);

  const session = await getActiveSession(request);
  if (!session) return jsonError("Please log in to submit items.", 401);

  const body = await readJson(request, 64_000);
  if (!body.ok) return body.response;

  // Hidden field that only bots fill in: pretend it worked.
  if (typeof body.data.website === "string" && body.data.website.trim()) return jsonOk();

  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);

  if (!(await withinRateLimit(request, "shop-submit", 10, 60 * 60, session.user.id))) {
    return jsonError("You've submitted a lot recently. Please try again in an hour.", 429);
  }

  // Check the account as the user (Row Level Security) rather than as an admin.
  const [profiles, shops] = await Promise.all([
    userRest<Array<{ role: string }>>(session.accessToken, "profiles?select=role&limit=1"),
    userRest<Array<{ verification_status: string }>>(
      session.accessToken,
      "shop_owners?select=verification_status&limit=1",
    ),
  ]);
  if (profiles === null || shops === null) {
    return jsonError("We couldn't check your account. Please try again shortly.", 503);
  }
  if (profiles[0]?.role !== "shop_owner") {
    return jsonError("Only registered shop-owner accounts can submit items.", 403);
  }
  if (shops[0]?.verification_status !== "verified") {
    return jsonError("Your shop must be verified by ReLoop before you can submit items.", 403);
  }

  const rows = parsed.data.items.map((entry) => ({
    shop_owner_id: session.user.id,
    item_name: entry.itemName,
    category_id: null,
    brand: entry.brand || null,
    model: entry.model || null,
    description:
      [entry.category ? `Category: ${entry.category}` : "", entry.description]
        .filter(Boolean)
        .join("\n") || null,
    quantity: entry.quantity,
    condition: entry.condition,
    asking_price: entry.askingPrice,
    image_url: entry.imageUrl || null,
    status: "Pending",
  }));

  try {
    const insert = await fetch(`${config.url}/rest/v1/shop_submissions`, {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(rows),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!insert.ok) {
      console.error("Shop submission insert failed:", insert.status, await insert.text());
      return jsonError("We couldn't save your items. Please try again or contact ReLoop.", 502);
    }
  } catch (error) {
    console.error("Shop submission error:", error);
    return jsonError("A connection error occurred. Please try again.", 502);
  }

  const result = NextResponse.json({ ok: true, count: rows.length }, { headers: noStore });
  if (session.refreshed) applySessionCookies(result, session.refreshed);
  return result;
}

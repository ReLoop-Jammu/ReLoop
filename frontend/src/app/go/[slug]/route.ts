import { NextResponse } from "next/server";
import { findTrackedLink, trackedDestination } from "@/config/tracked-links";

export const runtime = "nodejs";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Link previews, prefetches and crawlers don't count as visits. */
function isRealVisit(request: Request) {
  const h = request.headers;
  if (h.get("next-router-prefetch") || h.get("purpose") === "prefetch") return false;
  if (request.method === "HEAD") return false;
  return !/bot|crawl|spider|preview|facebookexternalhit|whatsapp|slurp/i.test(
    h.get("user-agent") ?? "",
  );
}

/**
 * Short links shared on Instagram, WhatsApp and the printed QR code
 * (src/config/tracked-links.ts). Counts the click (link, source, medium and
 * time only, nothing personal), then redirects to the landing page with UTM
 * tags. Counting never blocks or breaks the redirect; unknown links go home.
 */
export async function GET(request: Request, ctx: RouteContext<"/go/[slug]">) {
  const { slug } = await ctx.params;
  const link = findTrackedLink(slug);
  if (link && SUPABASE_URL && SERVICE_KEY && isRealVisit(request)) {
    try {
      await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/link_visits`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ slug: link.slug, source: link.source, medium: link.medium }),
        signal: AbortSignal.timeout(1500),
        cache: "no-store",
      });
    } catch {
      // A missed count is fine; a broken link is not.
    }
  }
  const target = link ? trackedDestination(link) : "/";
  const response = NextResponse.redirect(new URL(target, request.url), 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

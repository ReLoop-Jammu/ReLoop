import { NextResponse } from "next/server";
import { DRIVE_LINK } from "@/config/locations";

export const runtime = "nodejs";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Link previews, prefetches and crawlers don't count as scans. */
function isRealVisit(request: Request) {
  const h = request.headers;
  if (h.get("next-router-prefetch") || h.get("purpose") === "prefetch") return false;
  return !/bot|crawl|spider|preview|facebookexternalhit|whatsapp|slurp/i.test(
    h.get("user-agent") ?? "",
  );
}

/**
 * The awareness-drive QR code points here (printed codes depend on this path).
 * Counts the scan (campaign and time only, nothing personal), then redirects
 * to the locations page. Counting never blocks or breaks the redirect.
 */
export async function GET(request: Request) {
  if (SUPABASE_URL && SERVICE_KEY && isRealVisit(request)) {
    try {
      await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/qr_scans`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ campaign: DRIVE_LINK.campaign }),
        signal: AbortSignal.timeout(1500),
        cache: "no-store",
      });
    } catch {
      // A missed count is fine; a broken QR code is not.
    }
  }
  const response = NextResponse.redirect(new URL(DRIVE_LINK.destination, request.url), 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

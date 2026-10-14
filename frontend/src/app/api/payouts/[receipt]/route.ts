import { isReceiptNo, type Receipt } from "@/features/payouts/receipt";
import { receiptPdf } from "@/features/payouts/receipt-pdf";
import { bearer, reply } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const URL_ = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/$/,
  "",
);
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * A payout receipt as a PDF, for the shop it was paid to or for hub staff.
 * The database decides who may read it (payout_receipt() runs as the
 * caller), so this needs no service key.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/payouts/[receipt]">) {
  const { receipt } = await ctx.params;
  if (!isReceiptNo(receipt)) return reply({ error: "Unknown receipt." }, 404);
  const token = bearer(request);
  if (!token) return reply({ error: "Please log in again." }, 401);
  if (!URL_ || !KEY) return reply({ error: "Receipts aren't available right now." }, 503);
  const r = await fetch(`${URL_}/rest/v1/rpc/payout_receipt`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_receipt: receipt }),
    cache: "no-store",
  }).catch(() => null);
  if (!r) return reply({ error: "Receipts aren't available right now." }, 503);
  if (r.status === 401) return reply({ error: "Please log in again." }, 401);
  if (!r.ok) return reply({ error: "Receipts aren't available right now." }, 502);
  const rows = (await r.json()) as Receipt[];
  if (!rows[0]) return reply({ error: "Unknown receipt." }, 404);
  let pdf: Uint8Array;
  try {
    pdf = await receiptPdf(rows[0]);
  } catch {
    return reply({ error: "The receipt couldn't be made. Please tell ReLoop." }, 500);
  }
  return new Response(new Blob([pdf as BlobPart], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

import { handoverRecordPdf } from "@/features/records/record-pdf";
import type { HandoverRecord } from "@/features/records/record";
import { bearer, reply } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const URL_ = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/$/,
  "",
);
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The handover record of an institution's lot, for hub staff. The database
 * function decides who may read it (staff only) with the caller's own token,
 * so this needs no service key.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/handover-record/[lotId]">) {
  const { lotId } = await ctx.params;
  if (!UUID.test(lotId)) return reply({ error: "Unknown lot." }, 404);
  const token = bearer(request);
  if (!token) return reply({ error: "Please log in again." }, 401);
  if (!URL_ || !KEY) return reply({ error: "Records aren't available right now." }, 503);
  const r = await fetch(`${URL_}/rest/v1/rpc/handover_record`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_lot: lotId }),
    cache: "no-store",
  }).catch(() => null);
  if (!r) return reply({ error: "Records aren't available right now." }, 503);
  if (r.status === 401) return reply({ error: "Please log in again." }, 401);
  if (!r.ok) return reply({ error: "That record isn't available." }, r.status === 403 ? 403 : 404);
  const rec = (await r.json()) as HandoverRecord;
  const pdf = await handoverRecordPdf(rec).catch(() => null);
  if (!pdf) return reply({ error: "The record couldn't be made." }, 500);
  return new Response(new Blob([pdf as BlobPart], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="handover-record.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

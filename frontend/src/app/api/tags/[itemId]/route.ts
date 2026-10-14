import { categoryLabel, PART_TYPES, type Category } from "@/features/inventory/model";
import { isItemTag } from "@/features/passport/server";
import { tagPdf } from "@/features/passport/tag-pdf";
import { bearer, reply } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const URL_ = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/$/,
  "",
);
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * The printable tag of an item, for hub staff. The database decides who may
 * read the item (staff only, through Row Level Security), with the caller's
 * own token, so this needs no service key.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/tags/[itemId]">) {
  const { itemId } = await ctx.params;
  if (!isItemTag(itemId)) return reply({ error: "Unknown item." }, 404);
  const token = bearer(request);
  if (!token) return reply({ error: "Please log in again." }, 401);
  if (!URL_ || !KEY) return reply({ error: "Tags aren't available right now." }, 503);
  const r = await fetch(
    `${URL_}/rest/v1/items?select=id,category,part_type&id=eq.${encodeURIComponent(itemId)}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${token}` }, cache: "no-store" },
  ).catch(() => null);
  if (!r) return reply({ error: "Tags aren't available right now." }, 503);
  if (r.status === 401) return reply({ error: "Please log in again." }, 401);
  const rows = r.ok
    ? ((await r.json()) as { id: string; category: Category; part_type: string | null }[])
    : [];
  if (!rows[0]) return reply({ error: "Unknown item." }, 404);
  const kind =
    rows[0].category === "part"
      ? (PART_TYPES.find((p) => p.value === rows[0].part_type)?.label ?? "Part")
      : categoryLabel(rows[0].category);
  const pdf = await tagPdf(itemId, kind).catch(() => null);
  if (!pdf) return reply({ error: "The tag couldn't be made." }, 500);
  return new Response(new Blob([pdf as BlobPart], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${itemId}-tag.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

import { EXTENSION, MIME, stripMetadata } from "@/features/exchange/exif";
import { bearer, reply } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const URL_ = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/$/,
  "",
);
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

type Listing = { id: string; status: string; item_id: string | null; photos: string[] };

/**
 * Staff approved a shop's part listing: its private photos are copied to the
 * public item-photo path (and recorded against the tag), so only approved
 * listings ever have public photos. Runs as the staff member, so the storage
 * and table policies (staff only) decide; no service key is used.
 */
export async function POST(request: Request) {
  const token = bearer(request);
  if (!token) return reply({ error: "Please log in again." }, 401);
  if (!URL_ || !KEY) return reply({ error: "Photos aren't available right now." }, 503);
  const body = (await request.json().catch(() => null)) as { listing?: string } | null;
  const id = body?.listing;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return reply({ error: "Unknown listing." }, 400);

  const headers = { apikey: KEY, Authorization: `Bearer ${token}` };
  const lr = await fetch(
    `${URL_}/rest/v1/part_listings?id=eq.${id}&select=id,status,item_id,photos`,
    { headers, cache: "no-store" },
  ).catch(() => null);
  if (!lr?.ok) return reply({ error: "Unknown listing." }, 404);
  const listing = ((await lr.json()) as Listing[])[0];
  if (!listing || listing.status !== "approved" || !listing.item_id)
    return reply({ error: "Approve the listing first." }, 409);

  let copied = 0;
  for (const [position, path] of listing.photos.slice(0, 3).entries()) {
    if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path)) continue;
    const src = await fetch(`${URL_}/storage/v1/object/part-listing-photos/${path}`, {
      headers,
      cache: "no-store",
    }).catch(() => null);
    if (!src?.ok) continue;
    // The shop's photo was cleaned on upload; clean it again before it goes public.
    const clean = stripMetadata(new Uint8Array(await src.arrayBuffer()));
    if (!clean) continue;
    const target = `${listing.item_id}/shop-${position}.${EXTENSION[clean.kind]}`;
    const up = await fetch(`${URL_}/storage/v1/object/item-photos/${target}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": MIME[clean.kind], "x-upsert": "true" },
      body: new Blob([clean.bytes as BlobPart], { type: MIME[clean.kind] }),
      cache: "no-store",
    }).catch(() => null);
    if (!up?.ok) continue;
    const row = await fetch(`${URL_}/rest/v1/item_photos?on_conflict=item_id,position`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ item_id: listing.item_id, position, storage_path: target }),
      cache: "no-store",
    }).catch(() => null);
    if (row?.ok) copied++;
  }
  return reply({ copied });
}

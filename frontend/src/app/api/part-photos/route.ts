import { randomUUID } from "node:crypto";
import { EXTENSION, MIME, stripMetadata } from "@/features/exchange/exif";
import { bearer, reply, userFromToken } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const URL_ = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/$/,
  "",
);
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * A partner shop's photo of a part: checked (JPEG, PNG or WebP, at most 5 MB),
 * stripped of its EXIF and other metadata, and stored in the private
 * part-listing-photos bucket under the shop's own folder, as the shop (so the
 * database's storage policy decides whether it may). Returns the stored path.
 */
export async function POST(request: Request) {
  const token = bearer(request);
  if (!token) return reply({ error: "Please log in again." }, 401);
  if (!URL_ || !KEY) return reply({ error: "Photos aren't available right now." }, 503);
  const user = await userFromToken(token).catch(() => null);
  if (!user) return reply({ error: "Please log in again." }, 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return reply({ error: "Choose a photo." }, 400);
  if (file.size > MAX_BYTES) return reply({ error: "That photo is larger than 5 MB." }, 413);
  const clean = stripMetadata(new Uint8Array(await file.arrayBuffer()));
  if (!clean) return reply({ error: "Use a JPG, PNG or WebP photo." }, 415);

  const path = `${user.id}/${randomUUID()}.${EXTENSION[clean.kind]}`;
  const r = await fetch(`${URL_}/storage/v1/object/part-listing-photos/${path}`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": MIME[clean.kind],
      "x-upsert": "false",
    },
    body: new Blob([clean.bytes as BlobPart], { type: MIME[clean.kind] }),
    cache: "no-store",
  }).catch(() => null);
  if (!r) return reply({ error: "Photos aren't available right now." }, 503);
  if (r.status === 401 || r.status === 403)
    return reply({ error: "Only verified partner shops can add photos." }, 403);
  if (!r.ok) return reply({ error: "The photo couldn't be saved." }, 502);
  return reply({ path });
}

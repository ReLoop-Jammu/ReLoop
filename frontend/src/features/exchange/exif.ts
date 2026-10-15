/**
 * Removes metadata (EXIF location and camera data, XMP, IPTC, text) from a
 * JPEG, PNG or WebP photo, without re-encoding it. Returns null if the bytes
 * are not a well-formed image of a supported type. Pure, so it can be tested.
 */
export type ImageKind = "jpeg" | "png" | "webp";

export function imageKind(b: Uint8Array): ImageKind | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length > 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v))
    return "png";
  if (
    b.length > 12 &&
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}

export const MIME: Record<ImageKind, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
export const EXTENSION: Record<ImageKind, string> = { jpeg: "jpg", png: "png", webp: "webp" };

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};
const ascii = (b: Uint8Array, from: number, len: number) =>
  String.fromCharCode(...b.slice(from, from + len));

function stripJpeg(b: Uint8Array): Uint8Array | null {
  const out: Uint8Array[] = [b.slice(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0xda) {
      // Start of scan: the rest is image data.
      out.push(b.slice(i));
      return concat(out);
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) return null;
    // APP1 (EXIF, XMP), APP13 (IPTC) and comments are dropped; everything else is kept.
    if (marker !== 0xe1 && marker !== 0xed && marker !== 0xfe) out.push(b.slice(i, i + 2 + len));
    i += 2 + len;
  }
  return null;
}

const PNG_DROP = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);
function stripPng(b: Uint8Array): Uint8Array | null {
  const out: Uint8Array[] = [b.slice(0, 8)];
  let i = 8;
  let sawEnd = false;
  let first = true;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = ascii(b, i + 4, 4);
    const end = i + 12 + len;
    if (end > b.length) return null;
    if (first && type !== "IHDR") return null;
    first = false;
    if (!PNG_DROP.has(type)) out.push(b.slice(i, end));
    if (type === "IEND") {
      sawEnd = true;
      break;
    }
    i = end;
  }
  return sawEnd ? concat(out) : null;
}

function stripWebp(b: Uint8Array): Uint8Array | null {
  const chunks: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, 4);
    const len = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    const end = i + 8 + len + (len % 2);
    if (end > b.length + (len % 2)) return null;
    if (type !== "EXIF" && type !== "XMP ") {
      const chunk = b.slice(i, Math.min(end, b.length));
      if (type === "VP8X" && chunk.length >= 9) chunk[8] &= ~(0x08 | 0x04); // no EXIF or XMP flags
      chunks.push(chunk);
    }
    i = end;
  }
  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set(b.slice(0, 4), 0);
  const size = body.length + 4;
  header.set([size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >>> 24) & 0xff], 4);
  header.set(b.slice(8, 12), 8);
  return concat([header, body]);
}

export function stripMetadata(bytes: Uint8Array): { kind: ImageKind; bytes: Uint8Array } | null {
  const kind = imageKind(bytes);
  if (!kind) return null;
  const out =
    kind === "jpeg" ? stripJpeg(bytes) : kind === "png" ? stripPng(bytes) : stripWebp(bytes);
  return out ? { kind, bytes: out } : null;
}

import "server-only";
import { NextResponse } from "next/server";

export const noStore = { "Cache-Control": "no-store" } as const;

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: noStore });
}

export function jsonOk(body: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ ok: true, ...body }, { status, headers: noStore });
}

/**
 * Cross-site request protection for cookie-authenticated POSTs. Browsers always
 * send Origin on cross-site and same-site fetch POSTs; a missing or different
 * origin is refused.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Best-effort client address for rate limiting (first hop of the proxy chain). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export type JsonBody =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: NextResponse };

/** Reads a JSON object body, refusing anything larger than `maxBytes`. */
export async function readJson(request: Request, maxBytes: number): Promise<JsonBody> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    return { ok: false, response: jsonError("That request is too large.", 413) };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: jsonError("Please submit valid form data.", 400) };
  }
  if (raw.length > maxBytes) {
    return { ok: false, response: jsonError("That request is too large.", 413) };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
    return { ok: true, data: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, response: jsonError("Please submit valid form data.", 400) };
  }
}

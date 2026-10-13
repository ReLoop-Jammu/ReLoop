import "server-only";
import { createMemoryLimiter } from "../rate-limit-memory";
import { supabaseConfig } from "./config";
import { clientIp } from "./http";

const memory = createMemoryLimiter();

/**
 * True while the caller is within `limit` requests per `windowSeconds`.
 * Checks the in-process counter first, then the shared database counter
 * (public.hit_rate_limit) so limits hold across serverless instances. If the
 * database limiter is unreachable it fails open: the in-process limit still applies.
 */
export async function withinRateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds: number,
  subject?: string,
): Promise<boolean> {
  const key = `${bucket}:${subject ?? clientIp(request)}`;
  if (!memory(key, limit, windowSeconds)) return false;

  const config = supabaseConfig();
  if (!config?.serviceKey) return true;

  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/hit_rate_limit`, {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: windowSeconds }),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return true;
    return (await response.json()) !== false;
  } catch {
    return true;
  }
}

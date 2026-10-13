/**
 * Small in-process rate limiter: a first line of defence that works with no
 * database. It is per server instance, so the API routes also use the shared
 * database limiter (see server/rate-limit.ts) when it is available.
 */
type Bucket = { start: number; hits: number };

export function createMemoryLimiter(maxKeys = 5000) {
  const buckets = new Map<string, Bucket>();

  return function hit(key: string, limit: number, windowSeconds: number, now = Date.now()): boolean {
    const windowMs = windowSeconds * 1000;
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.start >= windowMs) {
      if (buckets.size >= maxKeys) {
        for (const [k, b] of buckets) if (now - b.start >= windowMs) buckets.delete(k);
        if (buckets.size >= maxKeys) buckets.clear();
      }
      buckets.set(key, { start: now, hits: 1 });
      return true;
    }

    bucket.hits += 1;
    return bucket.hits <= limit;
  };
}

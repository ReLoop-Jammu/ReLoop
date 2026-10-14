/**
 * Fetches every row of a list one page at a time. Supabase returns at most
 * 1,000 rows per request, so a single request quietly drops the rest (the hub
 * holds more items than that). Pages are asked for with the HTTP Range header;
 * the loop stops at the first short page.
 */
export async function allPages<T>(
  page: (headers: Record<string, string>) => Promise<T[]>,
  size = 1000,
  max = 100,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    const from = i * size;
    const rows = await page({ "Range-Unit": "items", Range: `${from}-${from + size - 1}` });
    out.push(...rows);
    if (rows.length < size) return out;
  }
  throw new Error("That list is too long to load at once.");
}

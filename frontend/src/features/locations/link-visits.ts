"use client";

import { authenticatedFetch } from "@/lib/auth-client";

export type LinkVisitCount = { slug: string; this_month: number; all_time: number };

/** Clicks per tracked link, this month (IST) and all time. Admins only. */
export async function linkVisitCounts(): Promise<LinkVisitCount[]> {
  const response = await authenticatedFetch("/rest/v1/rpc/link_visit_counts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) throw new Error("Could not load the link counts.");
  const rows = (await response.json()) as LinkVisitCount[];
  return rows.map((r) => ({
    ...r,
    this_month: Number(r.this_month),
    all_time: Number(r.all_time),
  }));
}

export type LinkVisitDay = { day: string; slug: string; visits: number };

/** Visits per link per day (India time) for the last `days` days. Admins only. */
export async function linkVisitSeries(days: number): Promise<LinkVisitDay[]> {
  const response = await authenticatedFetch("/rest/v1/rpc/link_visit_series", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_days: days }),
  });
  if (!response.ok) throw new Error("Could not load the visits per day.");
  const rows = (await response.json()) as LinkVisitDay[];
  return rows.map((r) => ({ ...r, visits: Number(r.visits) }));
}

export type Bucket = { start: string; total: number; bySlug: Record<string, number> };

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) =>
  isoDay(new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000));
/** The Monday on or before `day`. */
const weekStart = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  return addDays(day, -((d.getUTCDay() + 6) % 7));
};

/**
 * Visits grouped by day or by week (weeks start on Monday), for the `days`
 * days ending on `today`, with empty days and weeks included so a chart
 * shows the gaps.
 */
export function bucketVisits(
  rows: readonly LinkVisitDay[],
  days: number,
  by: "day" | "week",
  today: string,
): Bucket[] {
  const first = addDays(today, -(days - 1));
  const keyOf = (day: string) => (by === "day" ? day : weekStart(day));
  const buckets = new Map<string, Bucket>();
  for (let d = first; d <= today; d = addDays(d, 1)) {
    const k = keyOf(d);
    if (!buckets.has(k)) buckets.set(k, { start: k, total: 0, bySlug: {} });
  }
  for (const r of rows) {
    if (r.day < first || r.day > today) continue;
    const b = buckets.get(keyOf(r.day));
    if (!b) continue;
    b.total += r.visits;
    b.bySlug[r.slug] = (b.bySlug[r.slug] ?? 0) + r.visits;
  }
  return [...buckets.values()];
}

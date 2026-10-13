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

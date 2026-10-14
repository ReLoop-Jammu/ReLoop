"use client";

import { authenticatedFetch, siteFetch } from "@/lib/auth-client";

export type SettingRow = { key: string; value: unknown; is_public: boolean; updated_at: string };

/** Every setting (staff can read them all; Row Level Security hides them from others). */
export async function loadSettings(): Promise<Record<string, SettingRow>> {
  const r = await authenticatedFetch("/rest/v1/app_settings?select=key,value,is_public,updated_at");
  if (!r.ok) throw new Error("Could not load the settings.");
  const rows = (await r.json()) as SettingRow[];
  return Object.fromEntries(rows.map((x) => [x.key, x]));
}

/** Saves one setting (admins only; the database checks the type and logs the change). */
export async function saveSetting(key: string, value: unknown) {
  const r = await authenticatedFetch("/rest/v1/rpc/set_setting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_key: key, p_value: value }),
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "That setting wasn't saved.");
  }
}

/**
 * Tells the site to drop its cached settings, so pages show the change on the
 * next visit. Best effort: if it fails, the cache still expires within a minute.
 */
export async function refreshSiteSettings(): Promise<boolean> {
  try {
    return (await siteFetch("/api/admin/settings/refresh", { method: "POST" })).ok;
  } catch {
    return false;
  }
}

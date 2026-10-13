"use client";

import { DRIVE_LINK } from "@/config/locations";
import { authenticatedFetch } from "@/lib/auth-client";

/** How many times the awareness-drive QR code was scanned. Admins only (RLS). */
export async function countDriveScans(): Promise<number> {
  const response = await authenticatedFetch(
    `/rest/v1/qr_scans?select=id&campaign=eq.${DRIVE_LINK.campaign}`,
    { headers: { Prefer: "count=exact", Range: "0-0" } },
  );
  if (!response.ok) throw new Error("Could not load the QR scan count.");
  return Number(response.headers.get("content-range")?.split("/")[1] ?? 0) || 0;
}

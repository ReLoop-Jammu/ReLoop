"use client";

import { allPages } from "@/lib/pages";
import { authenticatedFetch, getSession } from "@/lib/auth-client";

export type VerificationStatus = "pending" | "verified" | "rejected";

export type ShopOwner = {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  business_address: string | null;
  city: string | null;
  gstin: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  review_notes: string;
  created_at: string;
  show_on_map: boolean;
  map_consent_at: string | null;
  map_market: string;
  map_lat: number | null;
  map_lng: number | null;
  map_approximate: boolean;
};

const COLUMNS =
  "id,shop_name,owner_name,phone,email,business_address,city,gstin,verification_status,verified_at,review_notes,created_at,show_on_map,map_consent_at,map_market,map_lat,map_lng,map_approximate";

export type Review = {
  verification_status: "verified" | "rejected";
  verified_at: string | null;
  reviewed_by: string;
  review_notes: string;
};

/**
 * The fields an admin's decision writes. A rejection needs a reason the team
 * can read back later; verifying stamps verified_at, rejecting clears it.
 */
export function buildReview(
  decision: "verify" | "reject",
  note: string,
  adminId: string,
  now = new Date(),
): Review {
  const reason = note.trim();
  if (decision === "reject" && reason.length < 3) {
    throw new Error("Write a short reason for the rejection.");
  }
  return {
    verification_status: decision === "verify" ? "verified" : "rejected",
    verified_at: decision === "verify" ? now.toISOString() : null,
    reviewed_by: adminId,
    review_notes: reason.slice(0, 500),
  };
}

/** Every shop owner, newest first. Row Level Security shows all of them to admins only. */
export async function listShopOwners(): Promise<ShopOwner[]> {
  return allPages(async (headers) => {
    const response = await authenticatedFetch(
      `/rest/v1/shop_owners?select=${COLUMNS}&order=created_at.desc,id.asc`,
      { headers },
    );
    if (!response.ok) throw new Error("Could not load shop owners.");
    return (await response.json()) as ShopOwner[];
  });
}

/** Saves an admin's decision, and fails unless exactly that one shop was changed. */
export async function reviewShop(
  id: string,
  decision: "verify" | "reject",
  note: string,
): Promise<ShopOwner> {
  const adminId = getSession()?.user.id;
  if (!adminId) throw new Error("Please log in again.");
  const response = await authenticatedFetch(
    `/rest/v1/shop_owners?id=eq.${encodeURIComponent(id)}&select=${COLUMNS}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(buildReview(decision, note, adminId)),
    },
  );
  const rows = response.ok ? ((await response.json()) as ShopOwner[]) : [];
  if (rows.length !== 1)
    throw new Error("That change wasn't saved. Check you're logged in as an admin.");
  return rows[0];
}

export type MapListing =
  | { show: false }
  | {
      show: true;
      consentDate: string; // YYYY-MM-DD the shop agreed
      market: string;
      lat: number;
      lng: number;
      approximate: boolean;
    };

/** The fields a "show on map" decision writes (consent and position are required to show). */
export function buildMapListing(m: MapListing) {
  if (!m.show) return { show_on_map: false };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.consentDate))
    throw new Error("Enter the date the shop agreed.");
  if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng))
    throw new Error("Choose a market or enter a position.");
  if (m.lat < 32.6 || m.lat > 32.85 || m.lng < 74.75 || m.lng > 75) {
    throw new Error("That position isn't in Jammu. Check the numbers.");
  }
  return {
    show_on_map: true,
    map_consent_at: `${m.consentDate}T00:00:00Z`,
    map_market: m.market.trim().slice(0, 80),
    map_lat: Math.round(m.lat * 1e6) / 1e6,
    map_lng: Math.round(m.lng * 1e6) / 1e6,
    map_approximate: m.approximate,
  };
}

/** Puts a verified shop on the public map, or takes it off. Admins only. */
export async function setMapListing(id: string, m: MapListing): Promise<void> {
  const response = await authenticatedFetch(
    `/rest/v1/shop_owners?id=eq.${encodeURIComponent(id)}&select=id`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(buildMapListing(m)),
    },
  );
  const rows = response.ok ? ((await response.json()) as unknown[]) : [];
  if (rows.length !== 1) throw new Error("That change wasn't saved.");
}

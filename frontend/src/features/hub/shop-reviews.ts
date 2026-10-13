"use client";

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
};

const COLUMNS =
  "id,shop_name,owner_name,phone,email,business_address,city,gstin,verification_status,verified_at,review_notes,created_at";

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
  const response = await authenticatedFetch(
    `/rest/v1/shop_owners?select=${COLUMNS}&order=created_at.desc`,
  );
  if (!response.ok) throw new Error("Could not load shop owners.");
  return (await response.json()) as ShopOwner[];
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

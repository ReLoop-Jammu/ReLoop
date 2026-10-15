"use client";

import { siteFetch } from "@/lib/auth-client";
import { allPages } from "@/lib/pages";
import { call, rpc } from "@/lib/rpc";

export const EXCHANGE_PART_TYPES = [
  { value: "board", label: "Board" },
  { value: "screen", label: "Screen" },
  { value: "camera", label: "Camera" },
  { value: "charging_port", label: "Charging port" },
  { value: "battery", label: "Healthy battery" },
  { value: "ram", label: "Laptop RAM" },
  { value: "storage", label: "Laptop SSD" },
] as const;

export type ListingStatus = "submitted" | "at_hub" | "approved" | "rejected" | "withdrawn";
export const LISTING_LABEL: Record<ListingStatus, string> = {
  submitted: "Waiting: bring it on the route",
  at_hub: "At the hub: being tested",
  approved: "Listed",
  rejected: "Not approved",
  withdrawn: "Withdrawn",
};

export type MyListing = {
  id: string;
  part_type: string;
  brand: string;
  model: string;
  asking_paise: number;
  status: ListingStatus;
  reject_reason: string;
  item_id: string | null;
  item_status: string | null;
  sold_paise: number | null;
  shop_share_paise: number | null;
  payout_due_on: string | null;
  created_at: string;
};

export const myListings = () => rpc<MyListing[]>("my_part_listings");
export const canListParts = () => rpc<boolean>("can_list_parts");
export const withdrawListing = (id: string) =>
  rpc<null>("withdraw_part_listing", { p_listing: id });

/** Uploads one photo through the server (it strips the metadata) and returns its private path. */
export async function uploadPartPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const r = await siteFetch("/api/part-photos", { method: "POST", body: form });
  const data = (await r.json().catch(() => ({}))) as { path?: string; error?: string };
  if (!r.ok || !data.path) throw new Error(data.error ?? "The photo couldn't be saved.");
  return data.path;
}

/** After approval: copies the shop's private photos to the public item photos. */
export async function publishListingPhotos(listingId: string) {
  const r = await siteFetch("/api/hub/part-photos", {
    method: "POST",
    body: JSON.stringify({ listing: listingId }),
  });
  const data = (await r.json().catch(() => ({}))) as { copied?: number; error?: string };
  if (!r.ok) throw new Error(data.error ?? "The photos couldn't be published.");
  return data.copied ?? 0;
}

export async function submitListing(input: {
  partType: string;
  brand: string;
  model: string;
  description: string;
  askingPaise: number;
  agreeNamed: boolean;
  photos: string[];
}) {
  return rpc<string>("submit_part_listing", {
    p_part_type: input.partType,
    p_brand: input.brand,
    p_model: input.model,
    p_description: input.description,
    p_asking_paise: input.askingPaise,
    p_agree_named: input.agreeNamed,
    p_photos: input.photos,
  });
}

// ---------------------------------------------------------------- staff

export type HubListing = {
  id: string;
  partner_id: string;
  shop_owner_id: string;
  part_type: string;
  brand: string;
  model: string;
  description: string;
  asking_paise: number;
  photos: string[];
  status: ListingStatus;
  reject_reason: string;
  item_id: string | null;
  created_at: string;
};
export const hubListings = () =>
  allPages((headers) =>
    call<HubListing[]>(
      "part_listings?select=id,partner_id,shop_owner_id,part_type,brand,model,description,asking_paise,photos,status,reject_reason,item_id,created_at&order=created_at.desc",
      { headers },
    ),
  );
export const receiveListing = (id: string) =>
  rpc<string>("receive_part_listing", { p_listing: id });
export const approveListing = (id: string) => rpc<null>("approve_part_listing", { p_listing: id });
export const rejectListing = (id: string, reason: string) =>
  rpc<null>("reject_part_listing", { p_listing: id, p_reason: reason });

export type ExchangeSale = {
  id: string;
  item_id: string;
  partner_id: string | null;
  sold_paise: number;
  commission_pct: number;
  commission_paise: number;
  shop_share_paise: number;
  sold_at: string;
  payout_due_on: string;
  status: "sold" | "refunded" | "paid";
};
export const exchangeSales = () =>
  allPages((headers) =>
    call<ExchangeSale[]>(
      "exchange_sales?select=id,item_id,partner_id,sold_paise,commission_pct,commission_paise,shop_share_paise,sold_at,payout_due_on,status&order=sold_at.desc",
      { headers },
    ),
  );
export const payPartSale = (id: string, method: "upi" | "cash" = "upi") =>
  rpc<{ receipt_no: string; amount_paise: number; receipt_token: string }[]>("pay_part_sale", {
    p_sale: id,
    p_method: method,
  });

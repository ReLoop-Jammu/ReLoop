"use client";

import { authenticatedFetch } from "@/lib/auth-client";
import { allPages } from "@/lib/pages";

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await authenticatedFetch(`/rest/v1/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await r.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!r.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : "That didn't work. Please try again.";
    throw new Error(message);
  }
  return data as T;
}
const rpc = <T>(fn: string, args: Record<string, unknown> = {}) =>
  call<T>(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });

export const CLAIM_STEPS = [
  "approved",
  "repairing",
  "replaced",
  "refunded",
  "rejected",
  "closed",
] as const;
export type ClaimStep = (typeof CLAIM_STEPS)[number];
export type ClaimStatus = "open" | ClaimStep;

export const CLAIM_LABEL: Record<ClaimStatus, string> = {
  open: "Waiting for ReLoop",
  approved: "Accepted: bring it to the hub",
  repairing: "Being repaired",
  replaced: "Replaced",
  refunded: "Refunded",
  rejected: "Not accepted",
  closed: "Closed",
};
export const isClosedClaim = (s: string) =>
  ["replaced", "refunded", "rejected", "closed"].includes(s);

// ---------------------------------------------------------------- buyers

export type WarrantyItem = {
  item_id: string;
  title: string | null;
  grade: string;
  sold_at: string;
  days_left: number;
  claim_status: ClaimStatus | null;
};
export type MyClaim = {
  id: string;
  item_id: string;
  title: string | null;
  fault: string;
  status: ClaimStatus;
  resolution: string;
  created_at: string;
  closed_at: string | null;
};
export const myWarrantyItems = () => rpc<WarrantyItem[]>("my_warranty_items");
export const myClaims = () => rpc<MyClaim[]>("my_warranty_claims");
export const openClaim = (itemId: string, fault: string) =>
  rpc<string>("open_warranty_claim", { p_item: itemId, p_fault: fault });

// ---------------------------------------------------------------- hub staff

export type HubClaim = {
  id: string;
  item_id: string;
  buyer_id: string | null;
  opened_by: "buyer" | "staff";
  contact_name: string;
  contact_phone: string;
  fault: string;
  status: ClaimStatus;
  resolution: string;
  staff_note: string;
  created_at: string;
  closed_at: string | null;
};
export const listClaims = () =>
  allPages<HubClaim>((headers) =>
    call<HubClaim[]>(
      "warranty_claims?select=id,item_id,buyer_id,opened_by,contact_name,contact_phone,fault,status,resolution,staff_note,created_at,closed_at&order=created_at.desc,id",
      { headers },
    ),
  );
export const logClaim = (itemId: string, name: string, phone: string, fault: string) =>
  rpc<string>("log_warranty_claim", {
    p_item: itemId,
    p_name: name,
    p_phone: phone,
    p_fault: fault,
  });
export const decideClaim = (id: string, step: ClaimStep, resolution: string, staffNote: string) =>
  rpc<null>("decide_warranty_claim", {
    p_id: id,
    p_status: step,
    p_resolution: resolution,
    p_staff_note: staffNote,
  });

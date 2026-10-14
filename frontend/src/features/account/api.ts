"use client";

import { authenticatedFetch, getSession, siteFetch } from "@/lib/auth-client";
import type { RequestStage } from "@/features/requests/stages";

/** Calls a database function as the signed-in user; the database's message becomes the error. */
async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await authenticatedFetch(`/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
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

async function select<T>(path: string): Promise<T> {
  const r = await authenticatedFetch(`/rest/v1/${path}`);
  if (!r.ok) throw new Error("Couldn't load your details.");
  return (await r.json()) as T;
}

const me = () => {
  const id = getSession()?.user.id;
  if (!id) throw new Error("Please log in to continue.");
  return id;
};

// ---------------------------------------------------------------- requests

export type MyRequest = RequestStage & { id: string; status_token: string };

export const myRequests = () => rpc<MyRequest[]>("my_requests");
export const cancelMyRequest = (id: string) => rpc<null>("cancel_my_request", { p_id: id });

// ---------------------------------------------------------------- notifications

export type Notification = {
  id: number;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  created_at: string;
  read_at: string | null;
};

export const myNotifications = (limit = 50) =>
  select<Notification[]>(
    `notifications?select=id,kind,title,body,href,created_at,read_at&order=created_at.desc&limit=${limit}`,
  );
/** Marks the given notifications read, or all of them. Returns how many changed. */
export const markNotificationsRead = (ids?: number[]) =>
  rpc<number>("mark_notifications_read", ids ? { p_ids: ids } : {});

// ---------------------------------------------------------------- profile and shop

export type MyProfile = { full_name: string; phone: string };
export type MyShop = { shop_name: string; gstin: string | null; business_address: string | null };

export const myProfile = () =>
  select<MyProfile[]>(`profiles?select=full_name,phone&user_id=eq.${me()}`).then(
    (r) => r[0] ?? null,
  );
export const myShop = () =>
  select<MyShop[]>(`shop_owners?select=shop_name,gstin,business_address&id=eq.${me()}`).then(
    (r) => r[0] ?? null,
  );
export const updateProfile = (fullName: string, phone: string) =>
  rpc<null>("update_my_profile", { p_full_name: fullName, p_phone: phone });
/** Returns the shop's verification status afterwards ("pending" after a new name or GSTIN). */
export const updateShop = (shopName: string, gstin: string, address: string) =>
  rpc<string>("update_my_shop", {
    p_shop_name: shopName,
    p_gstin: gstin,
    p_business_address: address,
  });

// ---------------------------------------------------------------- deleting the account

export type DeletionRequest = {
  id: string;
  status: "open" | "done" | "refused";
  note: string;
  created_at: string;
  handled_at: string | null;
};

export const myDeletionRequest = () =>
  select<DeletionRequest[]>(
    `deletion_requests?select=id,status,note,created_at,handled_at&user_id=eq.${me()}&order=created_at.desc&limit=1`,
  ).then((r) => r[0] ?? null);
export const requestDeletion = (reason: string) =>
  rpc<string>("request_account_deletion", { p_reason: reason });
export const withdrawDeletion = () => rpc<null>("withdraw_account_deletion");

// ---------------------------------------------------------------- offers, pickups and payouts (shop owners)

/** Accepts (booking the next route day, returned) or declines ReLoop's offer. */
export const respondToOffer = (submission: number, accept: boolean, note = "") =>
  rpc<string | null>("respond_to_offer", {
    p_submission: submission,
    p_accept: accept,
    p_note: note,
  });

export type MyPickup = {
  shop_submission_id: number;
  item_name: string;
  route_date: string;
  status: "scheduled" | "collected" | "cancelled";
  times_missed: number;
};
export const myPickups = () => rpc<MyPickup[]>("my_pickups");

export type MyPayout = {
  receipt_no: string;
  shop_submission_id: number;
  item_name: string;
  quantity: number;
  amount_paise: number;
  method: "cash" | "upi";
  paid_at: string;
};
export const myPayouts = () =>
  rpc<MyPayout[]>("my_payouts").then((r) =>
    r.map((p) => ({ ...p, amount_paise: Number(p.amount_paise) })),
  );

/** Downloads a receipt PDF (the owner's own, or any for staff). */
export async function downloadReceipt(receiptNo: string) {
  const r = await siteFetch(`/api/payouts/${encodeURIComponent(receiptNo)}`);
  if (!r.ok) throw new Error("The receipt couldn't be downloaded. Please try again.");
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `${receiptNo}.pdf`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

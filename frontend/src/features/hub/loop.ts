"use client";

import type { Category, PartType, Submission } from "@/features/inventory/model";
import { authenticatedFetch, getSession } from "@/lib/auth-client";

/*
 * The hub's side of the loop: reviewing shop submissions (offer, reject,
 * convert to hub items) and the inbox of public requests. Staff only: Row
 * Level Security returns nothing to anyone else.
 */

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(`/rest/v1/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `That didn't work (${response.status}).`;
    throw new Error(message);
  }
  return data as T;
}

// ---------------------------------------------------------------- shop submissions

export type ShopSubmission = {
  id: number;
  /** Null once the owner's account was deleted (a bought lot keeps its row). */
  shop_owner_id: string | null;
  item_name: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  quantity: number;
  condition: string;
  asking_price: number | null;
  image_url: string | null;
  status: string;
  offer_price: number | null;
  offer_note: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  purchase_price: number | null;
  purchased_at: string | null;
  created_at: string;
  owner_response_at?: string | null;
  owner_note?: string;
  shop?: { shop_name: string; owner_name: string; phone: string | null };
};

const SUBMISSION_COLUMNS =
  "id,shop_owner_id,item_name,brand,model,description,quantity,condition,asking_price,image_url,status,offer_price,offer_note,rejection_reason,reviewed_at,purchase_price,purchased_at,created_at,owner_response_at,owner_note";

/** Every shop submission, newest first, with the shop's name and phone. */
export async function listShopSubmissions(): Promise<ShopSubmission[]> {
  const [rows, shops] = await Promise.all([
    rest<ShopSubmission[]>(`shop_submissions?select=${SUBMISSION_COLUMNS}&order=created_at.desc`),
    rest<{ id: string; shop_name: string; owner_name: string; phone: string | null }[]>(
      "shop_owners?select=id,shop_name,owner_name,phone",
    ),
  ]);
  return rows.map((r) => {
    const shop = shops.find((s) => s.id === r.shop_owner_id);
    return shop ? { ...r, shop } : r;
  });
}

/**
 * The signed-in shop owner's own submissions. Filtered by owner: staff and
 * admins may read every shop's rows.
 */
export async function myShopSubmissions(): Promise<ShopSubmission[]> {
  const me = getSession()?.user.id;
  if (!me) return [];
  return rest<ShopSubmission[]>(
    `shop_submissions?select=id,item_name,quantity,condition,status,offer_price,offer_note,rejection_reason,reviewed_at,created_at,owner_response_at,owner_note&shop_owner_id=eq.${me}&order=created_at.desc`,
  );
}

async function review(id: number, fields: Record<string, unknown>) {
  const reviewer = getSession()?.user.id;
  // Ask for the id only: staff can't read internal_notes, so returning the whole
  // row would make the database refuse the update.
  const rows = await rest<unknown[]>(`shop_submissions?id=eq.${id}&select=id`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      ...fields,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewer,
    }),
  });
  if (rows.length !== 1) throw new Error("That change wasn't saved.");
}

/** Offers a price (in rupees, per item) with a note the shop will see. */
export function makeOffer(id: number, rupees: number, note: string) {
  if (!Number.isFinite(rupees) || rupees < 0) throw new Error("Enter the offer in rupees.");
  return review(id, {
    status: "Offered",
    offer_price: rupees,
    offer_note: note.trim().slice(0, 500),
  });
}

/** Rejects a submission with a reason the shop will see. */
export function rejectSubmission(id: number, reason: string) {
  if (reason.trim().length < 3) throw new Error("Write a short reason the shop will see.");
  return review(id, { status: "Rejected", rejection_reason: reason.trim().slice(0, 500) });
}

/** Turns an offered submission into one hub item per unit. Returns the new tags. */
export function convertSubmission(
  id: number,
  category: Category,
  partType: PartType | null,
  unitPricePaise: number,
): Promise<string[]> {
  return rest<string[]>("rpc/convert_submission", {
    method: "POST",
    body: JSON.stringify({
      p_submission: id,
      p_category: category,
      p_part_type: category === "part" ? partType : null,
      p_unit_price_paise: Math.round(unitPricePaise),
    }),
  });
}

/** The hub category a shop's own category wording most likely means. */
export function guessCategory(text: string): { category: Category; partType: PartType | null } {
  const t = text.toLowerCase();
  const is = (...words: string[]) => words.some((w) => t.includes(w));
  if (is("phone", "mobile", "tablet")) return { category: "phone", partType: null };
  if (is("laptop", "notebook")) return { category: "laptop", partType: null };
  if (is("desktop", "cpu cabinet")) return { category: "desktop", partType: null };
  if (is("monitor", "display")) return { category: "monitor", partType: null };
  if (is("tv", "television")) return { category: "tv", partType: null };
  if (is("printer")) return { category: "printer", partType: null };
  if (is("ups", "inverter")) return { category: "ups", partType: null };
  if (is("charger", "adapter")) return { category: "part", partType: "charger" };
  if (is("battery", "batteries")) return { category: "part", partType: "battery" };
  if (is("board", "motherboard")) return { category: "part", partType: "board" };
  if (is("ram", "memory")) return { category: "part", partType: "ram" };
  if (is("hard disk", "ssd", "hdd", "storage")) return { category: "part", partType: "storage" };
  if (is("screen", "panel")) return { category: "part", partType: "screen" };
  if (is("parts", "component")) return { category: "part", partType: "other" };
  if (is("appliance", "mixer", "fan", "iron"))
    return { category: "small_appliance", partType: null };
  return { category: "accessory", partType: null };
}

// ---------------------------------------------------------------- public requests

export type HubRequest = {
  id: string;
  kind: Submission["kind"];
  fields: Record<string, string>;
  status: Submission["status"];
  item_id: string | null;
  created_at: string;
  handled_at: string | null;
  /** True when sent from a signed-in account (the person sees it under My requests). */
  from_account: boolean;
  scheduled_for: string | null;
  cancelled_by: "buyer" | "staff" | null;
  cancel_reason: string | null;
};

type RequestRow = Omit<HubRequest, "from_account"> & { buyer_id: string | null };

export async function listRequests(): Promise<HubRequest[]> {
  const rows = await rest<RequestRow[]>(
    "submissions?select=id,kind,fields,status,item_id,created_at,handled_at,buyer_id,scheduled_for,cancelled_by,cancel_reason&order=created_at.desc",
  );
  return rows.map(({ buyer_id, ...r }) => ({ ...r, from_account: buyer_id !== null }));
}

/** Moves a request to a stage (scheduling a pickup needs its date). Cancelling goes through cancelRequest. */
export async function setRequestStatus(
  id: string,
  status: Exclude<Submission["status"], "cancelled">,
  scheduledFor?: string,
) {
  const rows = await rest<unknown[]>(`submissions?id=eq.${id}&select=id`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status,
      handled_at: status === "new" ? null : new Date().toISOString(),
      ...(scheduledFor !== undefined && { scheduled_for: scheduledFor }),
    }),
  });
  if (rows.length !== 1) throw new Error("That change wasn't saved.");
}

/** Cancels a request with a reason the person sees on their status page and account. */
export async function cancelRequest(id: string, reason: string) {
  await rest<null>("rpc/cancel_request", {
    method: "POST",
    body: JSON.stringify({ p_id: id, p_reason: reason }),
  });
}

// ---------------------------------------------------------------- pickups and payouts

export type HubPickup = {
  id: string;
  source: "shop" | "institution";
  shop_submission_id: number | null;
  request_id: string | null;
  route_date: string;
  market: string;
  status: "scheduled" | "collected" | "cancelled";
  times_missed: number;
};
export const listPickups = () =>
  rest<HubPickup[]>(
    "pickups?select=id,source,shop_submission_id,request_id,route_date,market,status,times_missed&order=route_date",
  );
/** Marks a pickup collected, or missed (it moves to the next route day, which is returned). */
export const setPickupStatus = (id: string, status: "collected" | "missed") =>
  rest<string>("rpc/set_pickup_status", {
    method: "POST",
    body: JSON.stringify({ p_id: id, p_status: status }),
  });

export type HubPayout = {
  receipt_no: string;
  shop_submission_id: number;
  amount_paise: number;
  method: "cash" | "upi";
  paid_at: string;
  reference: string;
  internal_note: string;
};
export const listPayouts = () =>
  rest<HubPayout[]>(
    "payouts?select=receipt_no,shop_submission_id,amount_paise,method,paid_at,reference,internal_note&order=created_at.desc",
  ).then((r) => r.map((p) => ({ ...p, amount_paise: Number(p.amount_paise) })));
/** Records the payment for a bought lot; returns its receipt number. */
export const recordPayout = (
  submission: number,
  p: { method: "cash" | "upi"; paidAt: string; reference: string; note: string },
) =>
  rest<string>("rpc/record_payout", {
    method: "POST",
    body: JSON.stringify({
      p_submission: submission,
      p_method: p.method,
      p_paid_at: p.paidAt,
      p_reference: p.reference,
      p_note: p.note,
    }),
  });

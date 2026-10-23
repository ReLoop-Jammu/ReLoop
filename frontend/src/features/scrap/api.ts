"use client";

import { call, rpc } from "@/lib/rpc";
import { allPages } from "@/lib/pages";

/** The five places scrap is kept at the hub. */
export const BINS = ["screens", "boards", "other", "d_devices", "batteries"] as const;
export type Bin = (typeof BINS)[number];
export const BIN_LABEL: Record<Bin, string> = {
  screens: "Screens",
  boards: "Boards",
  other: "Other",
  d_devices: "D devices",
  batteries: "Battery cabinet",
};

export type BinStatus = {
  bin: Bin;
  kg: number;
  oldest: string | null;
  days_waiting: number;
  near_limit: boolean;
  due: boolean;
};

export async function binStatus(): Promise<BinStatus[]> {
  const rows = await rpc<(Omit<BinStatus, "kg"> & { kg: number | string })[]>("bin_status");
  return rows.map((r) => ({ ...r, kg: Number(r.kg) }));
}

export type Receipt = {
  weighinId: string | null;
  receiptNo: string | null;
  amountPaise: number;
  token: string | null;
};

export type WeighinInput = {
  partnerId: string;
  screensKg: number;
  boardsKg: number;
  batteriesKg: number;
  otherKg: number;
  toTestCount: number;
  toTestNote: string;
  ownerConfirmed: boolean;
  swapDeclaration: boolean;
  method: "upi" | "cash";
  reference: string;
  pickupId?: string | null;
};

/** Weighs a shop's scrap and pays the counter weight by our scrap prices. */
export async function recordWeighin(w: WeighinInput): Promise<Receipt> {
  const rows = await rpc<
    {
      weighin_id: string;
      receipt_no: string | null;
      amount_paise: number | string;
      receipt_token: string | null;
    }[]
  >("record_weighin", {
    p_partner: w.partnerId,
    p_screens_kg: w.screensKg,
    p_boards_kg: w.boardsKg,
    p_batteries_kg: w.batteriesKg,
    p_other_kg: w.otherKg,
    p_to_test_count: w.toTestCount,
    p_to_test_note: w.toTestNote,
    p_owner_confirmed: w.ownerConfirmed,
    p_swap_declaration: w.swapDeclaration,
    p_method: w.method,
    p_reference: w.reference,
    p_pickup: w.pickupId ?? null,
  });
  const r = rows[0];
  return {
    weighinId: r.weighin_id,
    receiptNo: r.receipt_no,
    amountPaise: Number(r.amount_paise),
    token: r.receipt_token,
  };
}

export type Weighin = {
  id: string;
  partner_id: string;
  weighed_at: string;
  screens_kg: number;
  boards_kg: number;
  batteries_kg: number;
  other_kg: number;
  amount_paise: number;
  to_test_count: number;
  to_test_note: string;
};

export const listWeighins = () =>
  allPages((headers) =>
    call<Weighin[]>(
      "scrap_weighins?select=id,partner_id,weighed_at,screens_kg,boards_kg,batteries_kg,other_kg,amount_paise,to_test_count,to_test_note&order=weighed_at.desc",
      { headers },
    ),
  );

/** Hands whole bins to the licensed recycler on the partner's weight receipt. */
export const recordBinHandover = (bins: Bin[], receiptNo: string, notes = "") =>
  rpc<string>("record_bin_handover", { p_bins: bins, p_receipt_no: receiptNo, p_notes: notes });

/** Pays the shop for the tested working parts of a weigh-in, on their own receipt line. */
export const payTestedParts = (
  weighinId: string,
  items: string[],
  method: "upi" | "cash" = "upi",
) =>
  rpc<{ receipt_no: string; amount_paise: number; receipt_token: string }[]>("pay_tested_parts", {
    p_weighin: weighinId,
    p_items: items,
    p_method: method,
  });

export const markReceiptShared = (receiptNo: string) =>
  rpc<null>("mark_receipt_shared", { p_receipt: receiptNo });

/** A prefilled wa.me link with the private receipt page, for staff to tap from the hub phone. */
export function receiptWhatsappUrl(
  phone: string,
  token: string,
  origin: string,
  receiptNo: string,
): string {
  const digits = phone.replace(/\D/g, "");
  const number = digits.length === 10 ? `91${digits}` : digits;
  const text = `ReLoop receipt ${receiptNo}: ${origin}/receipt/${token}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export type PilotKpis = {
  month: string;
  kg_weighed: number;
  missed_pickups: number;
  parts_sold_paise: number;
  parts_target_paise: number | null;
  gate_one_met: boolean;
  unregistered_dealer_kg: number;
  dealer_reports: number;
  reuse_share: number | null;
  avg_days_in_stock: number | null;
};
export const pilotKpis = (month?: string) =>
  rpc<PilotKpis>("pilot_kpis", month ? { p_month: month } : {});

export type StockAlert = { kind: string; item_id: string; days: number; detail: string };
export const stockAlerts = () => rpc<StockAlert[]>("stock_alerts");

export type PriceCut = {
  item_id: string;
  title: string;
  current_paise: number;
  price_cut_at: string;
};
export const weeklyPriceCuts = () => rpc<PriceCut[]>("weekly_price_cuts");

export { call, rpc };

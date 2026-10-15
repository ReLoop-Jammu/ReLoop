/** One payout receipt, as payout_receipt() returns it (no staff-only fields). */
export type Receipt = {
  receipt_no: string;
  paid_at: string;
  amount_paise: number;
  method: "cash" | "upi" | string;
  item_name: string | null;
  quantity: number | null;
  shop_name: string;
  purchased_at: string | null;
  /** lot, scrap (a weigh-in), tested_parts, part_sale or lot_equipment. */
  line?: string;
  /** What a weigh-in or tested-parts receipt itemises: kg, rate and amount per category. */
  lines?: ReceiptLine[] | null;
  /** The seller's declaration, on a weigh-in receipt. */
  declaration?: string | null;
};

export type ReceiptLine = {
  label: string;
  kg?: number | string;
  rate_paise?: number | string;
  amount_paise: number | string;
};

export const isReceiptNo = (s: string) => /^RL-PAY-\d{4}-\d{4,}$/.test(s);

/** "INR 1,234.50": the standard PDF fonts have no rupee sign. */
export const inr = (paise: number) =>
  `INR ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const methodLabel = (m: string) => (m === "upi" ? "UPI" : m === "cash" ? "Cash" : m);

export const longDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

/** The lines printed on the receipt, in order (label, value). Pure, so it can be tested. */
export function receiptLines(r: Receipt): [string, string][] {
  return [
    ["Receipt number", r.receipt_no],
    ["Date paid", longDate(r.paid_at)],
    ["Paid to", r.shop_name],
    [
      "For",
      `${r.item_name ?? "Items"}${r.quantity && r.quantity > 1 ? ` (${r.quantity} items)` : ""}`,
    ],
    ...(r.lines ?? []).map((l): [string, string] => [
      l.label,
      l.kg !== undefined && l.rate_paise !== undefined
        ? `${Number(l.kg).toFixed(1)} kg at ${inr(Number(l.rate_paise))} = ${inr(Number(l.amount_paise))}`
        : inr(Number(l.amount_paise)),
    ]),
    ...(r.purchased_at ? ([["Bought on", longDate(r.purchased_at)]] as [string, string][]) : []),
    ["Amount", inr(Number(r.amount_paise))],
    ["Paid by", methodLabel(r.method)],
  ];
}

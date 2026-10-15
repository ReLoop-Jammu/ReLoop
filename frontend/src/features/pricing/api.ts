import { allPages } from "@/lib/pages";
import { call, rpc } from "@/lib/rpc";

/** One row of the staff-only item_margins view (money in paise; numbers may arrive as strings). */
export type MarginRow = {
  item_id: string;
  category: string;
  part_type: string | null;
  grade: string | null;
  status: string;
  source_type: string;
  received_at: string;
  listed_at: string | null;
  sold_at: string | null;
  days_to_sell: number | null;
  buy_paise: number | string;
  repair_paise: number | string;
  handling_paise: number | string;
  cogs_paise: number | string;
  expected_resale_paise: number | string | null;
  list_paise: number | string | null;
  current_paise: number | string | null;
  sold_paise: number | string | null;
  commission_item: boolean;
  commission_pct: number | string | null;
  commission_paise: number | string | null;
  margin_paise: number | string | null;
};

export const listMargins = () =>
  allPages((headers) => call<MarginRow[]>("item_margins?select=*&order=item_id", { headers }));

/** The staff-only settings the dashboard compares against (keys as stored). */
export type Benchmarks = Partial<{
  "finance.device_unit_paise": number | null;
  "finance.scrap_spread_paise_per_kg": number | null;
  "vrg.rates_paise": Record<string, number> | null;
  "rate_card.screens_paise": number;
  "rate_card.boards_paise": number;
  "rate_card.batteries_paise": number;
  "rate_card.other_paise": number;
  "rate_card.commission_pct": number;
  "pricing.handling_paise": Record<string, number>;
  "pricing.grade_b_factor": number;
}>;
export const pricingBenchmarks = () => rpc<Benchmarks>("pricing_benchmarks");

export type Suggestion = {
  paise: number;
  factor: number;
  source: string;
  checked_on: string;
  scope: "model" | "category";
} | null;

export const suggestedPrice = (a: {
  category: string;
  partType: string | null;
  brand: string;
  model: string;
  grade: string;
}) =>
  rpc<Suggestion>("suggested_price", {
    p_category: a.category,
    p_part_type: a.partType,
    p_brand: a.brand,
    p_model: a.model,
    p_grade: a.grade,
  });

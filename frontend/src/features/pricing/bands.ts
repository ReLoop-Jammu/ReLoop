/** A listed item's public price facts, from public_price_bands. */
export type PriceBand = {
  item_id: string;
  band_low_paise: number | null;
  band_high_paise: number | null;
  band_source: string | null;
  band_checked_on: string | null;
  band_scope: "model" | "category" | null;
  new_price_paise: number | null;
  new_price_source: string | null;
  new_price_checked_on: string | null;
};
export type PricePoint = { at: string; price_paise: number };

/** Where a price sits in its fair-price band. */
export function bandPosition(
  price: number,
  low: number,
  high: number,
): "below" | "within" | "above" {
  return price < low ? "below" : price > high ? "above" : "within";
}

/** Saving against the price new, rounded down to ₹50; null when there's no saving. */
export function savingVsNew(price: number, newPrice: number | null): number | null {
  if (!newPrice || newPrice <= price) return null;
  return Math.floor((newPrice - price) / 5000) * 5000 || null;
}

/** Price changes in date order, without repeats of the same price. */
export function priceSteps(points: readonly PricePoint[]): PricePoint[] {
  const out: PricePoint[] = [];
  for (const p of [...points].sort((a, b) => a.at.localeCompare(b.at)))
    if (out.at(-1)?.price_paise !== Number(p.price_paise))
      out.push({ ...p, price_paise: Number(p.price_paise) });
  return out;
}

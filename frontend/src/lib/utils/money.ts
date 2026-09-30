const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/**
 * Formats a price stored as integer paise. `null` means the seller asked
 * buyers to request a quote.
 */
export function formatPrice(pricePaise: number | null): string {
  if (pricePaise === null) return "Request quote";
  return inrFormatter.format(pricePaise / 100);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

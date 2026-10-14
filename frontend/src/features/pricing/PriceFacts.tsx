import { formatPrice } from "@/lib/utils/money";
import { bandPosition, priceSteps, savingVsNew, type PriceBand, type PricePoint } from "./bands";

const day = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const POSITION = {
  below: "Our price is below the usual range.",
  within: "Our price is within the usual range.",
  above: "Our price is above the usual range, for a reason we'll explain if you ask.",
};

/**
 * Price context for a listed item: the saving against new, the estimated
 * fair-price band with its source and date, and the item's own price
 * history. Each part shows only when ReLoop has a fresh figure for it.
 */
export function PriceFacts({
  price,
  band,
  history,
}: {
  price: number;
  band: PriceBand | null;
  history: PricePoint[];
}) {
  const saving = savingVsNew(price, band?.new_price_paise ?? null);
  const low = band?.band_low_paise != null ? Number(band.band_low_paise) : null;
  const high = band?.band_high_paise != null ? Number(band.band_high_paise) : null;
  const steps = priceSteps(history);
  if (!saving && low === null && steps.length < 2) return null;

  // The bar spans a little either side of the band and the price.
  const min = low === null ? 0 : Math.min(low, price) * 0.85;
  const max = high === null ? 0 : Math.max(high, price) * 1.1;
  const at = (v: number) => `${((v - min) / (max - min)) * 100}%`;

  return (
    <section
      aria-label="Price"
      className="mt-5 grid gap-4 rounded-card border border-line bg-surface p-4 text-sm"
    >
      {saving && band?.new_price_paise && (
        <p className="text-ink">
          <strong>About {formatPrice(saving)} less than new.</strong>{" "}
          <span className="text-ink-soft">
            New: {formatPrice(Number(band.new_price_paise))}
            {band.new_price_source && ` (${band.new_price_source}`}
            {band.new_price_checked_on && `, checked ${day(band.new_price_checked_on)}`}
            {band.new_price_source && ")"}.
          </span>
        </p>
      )}
      {low !== null && high !== null && (
        <div>
          <p className="text-ink">
            Estimated fair price{" "}
            {band?.band_scope === "model" ? "for this model" : "for this kind of item"} and grade:{" "}
            <strong>
              {formatPrice(low)} to {formatPrice(high)}
            </strong>
          </p>
          <div className="relative mt-3 h-3 rounded-full bg-sunken" aria-hidden="true">
            <span
              className="absolute inset-y-0 rounded-full bg-success/30"
              style={{ left: at(low), width: `calc(${at(high)} - ${at(low)})` }}
            />
            <span
              className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded-full bg-brand-600"
              style={{ left: at(price) }}
            />
          </div>
          <p className="mt-2 text-ink-soft">
            {POSITION[bandPosition(price, low, high)]}{" "}
            <span className="text-muted">
              Estimate from {band?.band_source}
              {band?.band_checked_on && `, checked ${day(band.band_checked_on)}`}.{" "}
              <a href="/how-we-price" className="underline">
                How we price
              </a>
            </span>
          </p>
        </div>
      )}
      {steps.length > 1 && (
        <div>
          <p className="text-muted">Price history</p>
          <ol className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-ink-soft">
            {steps.map((p, i) => (
              <li key={p.at} className="tabular-nums">
                {i > 0 && <span aria-hidden="true">→ </span>}
                {formatPrice(p.price_paise)} <span className="text-muted">({day(p.at)})</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

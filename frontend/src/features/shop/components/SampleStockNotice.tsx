import { Info } from "lucide-react";

export function SampleStockNotice() {
  return (
    <p className="mb-6 flex gap-3 rounded-card border border-gold-400/60 bg-gold-100 p-4 text-sm leading-relaxed text-gold-700">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <strong>These are sample items</strong> showing how graded stock will look. Our hub opens in
        November 2026 and real stock appears here as it is tested.
      </span>
    </p>
  );
}

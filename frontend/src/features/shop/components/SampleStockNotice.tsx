import { Notice } from "@/components/ui/Notice";

export function SampleStockNotice() {
  return (
    <Notice tone="warning" role="note" className="mb-6">
      <strong>These are sample items</strong> showing how graded stock will look. Our hub opens in
      November 2026 and real stock appears here as it is tested.
    </Notice>
  );
}

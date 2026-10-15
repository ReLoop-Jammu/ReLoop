import { Notice } from "@/components/ui/Notice";

export function SampleStockNotice() {
  return (
    <Notice tone="warning" role="note" className="mb-6">
      <strong>These are sample items</strong> showing how graded stock will look. Real stock appears
      here as it is tested.
    </Notice>
  );
}

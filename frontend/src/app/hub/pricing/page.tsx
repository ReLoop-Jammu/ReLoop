import type { Metadata } from "next";
import { PricingPage } from "@/features/hub/components/PricingPage";

export const metadata: Metadata = { title: "Pricing" };

export default function Page() {
  return <PricingPage />;
}

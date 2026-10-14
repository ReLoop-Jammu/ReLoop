import type { Metadata } from "next";
import { PriceReferencesPage } from "@/features/hub/components/PriceReferencesPage";

export const metadata: Metadata = { title: "Price references" };

export default function Page() {
  return <PriceReferencesPage />;
}

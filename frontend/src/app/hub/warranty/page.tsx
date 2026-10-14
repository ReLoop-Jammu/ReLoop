import type { Metadata } from "next";
import { WarrantyPage } from "@/features/hub/components/WarrantyPage";

export const metadata: Metadata = { title: "Warranty claims" };

export default function Page() {
  return <WarrantyPage />;
}

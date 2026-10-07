import type { Metadata } from "next";
import { PartnersPage } from "@/features/hub/components/PartnersPage";

export const metadata: Metadata = { title: "Shops & institutions" };

export default function Page() {
  return <PartnersPage />;
}

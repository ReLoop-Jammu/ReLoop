import type { Metadata } from "next";
import { LotsPage } from "@/features/hub/components/LotsPage";

export const metadata: Metadata = { title: "Institution lots" };

export default function Page() {
  return <LotsPage />;
}

import type { Metadata } from "next";
import { CapacityPage } from "@/features/hub/components/CapacityPage";

export const metadata: Metadata = { title: "Capacity" };

export default function Page() {
  return <CapacityPage />;
}

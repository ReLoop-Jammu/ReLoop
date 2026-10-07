import type { Metadata } from "next";
import { HandoversPage } from "@/features/hub/components/HandoversPage";

export const metadata: Metadata = { title: "Recycler handovers" };

export default function Page() {
  return <HandoversPage />;
}

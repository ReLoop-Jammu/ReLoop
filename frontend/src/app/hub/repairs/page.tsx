import type { Metadata } from "next";
import { RepairsPage } from "@/features/hub/components/RepairsPage";

export const metadata: Metadata = { title: "Repairs" };

export default function Page() {
  return <RepairsPage />;
}

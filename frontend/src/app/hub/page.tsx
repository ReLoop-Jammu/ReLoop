import type { Metadata } from "next";
import { HubHome } from "@/features/hub/components/HubHome";

export const metadata: Metadata = { title: "Overview" };

export default function HubOverviewPage() {
  return <HubHome />;
}

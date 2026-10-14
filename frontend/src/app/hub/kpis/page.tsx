import type { Metadata } from "next";
import { Dashboard } from "@/features/hub/components/Dashboard";

export const metadata: Metadata = { title: "KPIs" };

export default function HubKpisPage() {
  return <Dashboard />;
}

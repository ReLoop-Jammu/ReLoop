import type { Metadata } from "next";
import { RoutePage } from "@/features/hub/components/RoutePage";

export const metadata: Metadata = { title: "Route" };

export default function Page() {
  return <RoutePage />;
}

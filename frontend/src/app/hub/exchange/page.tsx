import type { Metadata } from "next";
import { ExchangePage } from "@/features/hub/components/ExchangePage";

export const metadata: Metadata = { title: "Parts Exchange" };

export default function Page() {
  return <ExchangePage />;
}

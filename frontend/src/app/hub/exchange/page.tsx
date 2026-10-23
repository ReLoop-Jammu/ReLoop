import type { Metadata } from "next";
import { ExchangePage } from "@/features/hub/components/ExchangePage";

export const metadata: Metadata = { title: "Used parts shop" };

export default function Page() {
  return <ExchangePage />;
}

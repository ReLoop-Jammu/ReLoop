import type { Metadata } from "next";
import { WeighinsPage } from "@/features/hub/components/WeighinsPage";

export const metadata: Metadata = { title: "Weigh-ins" };

export default function Page() {
  return <WeighinsPage />;
}

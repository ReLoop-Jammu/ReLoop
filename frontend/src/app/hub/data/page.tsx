import type { Metadata } from "next";
import { DataPage } from "@/features/hub/components/DataPage";

export const metadata: Metadata = { title: "Data & exports" };

export default function Page() {
  return <DataPage />;
}

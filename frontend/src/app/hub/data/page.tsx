import type { Metadata } from "next";
import { DataPage } from "@/features/hub/components/DataPage";

export const metadata: Metadata = { title: "Backup & publish" };

export default function Page() {
  return <DataPage />;
}

import type { Metadata } from "next";
import { DeletionsPage } from "@/features/hub/components/DeletionsPage";

export const metadata: Metadata = { title: "Account deletions" };

export default function Page() {
  return <DeletionsPage />;
}

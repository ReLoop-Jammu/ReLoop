import type { Metadata } from "next";
import { SubmissionsPage } from "@/features/hub/components/SubmissionsPage";

export const metadata: Metadata = { title: "Shop submissions" };

export default function Page() {
  return <SubmissionsPage />;
}

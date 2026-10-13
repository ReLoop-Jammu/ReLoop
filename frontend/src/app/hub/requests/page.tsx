import type { Metadata } from "next";
import { RequestsPage } from "@/features/hub/components/RequestsPage";

export const metadata: Metadata = { title: "Requests" };

export default function Page() {
  return <RequestsPage />;
}

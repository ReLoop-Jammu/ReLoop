import type { Metadata } from "next";
import { SearchPage } from "@/features/hub/components/SearchPage";

export const metadata: Metadata = { title: "Search" };

export default function Page() {
  return <SearchPage />;
}

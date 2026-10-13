import type { Metadata } from "next";
import { ShopReviewPage } from "@/features/hub/components/ShopReviewPage";

export const metadata: Metadata = { title: "Shop verification" };

export default function Page() {
  return <ShopReviewPage />;
}

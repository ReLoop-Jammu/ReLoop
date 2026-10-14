import type { Metadata } from "next";
import { LinksPage } from "@/features/hub/components/LinksPage";

export const metadata: Metadata = { title: "Links & QR codes" };

export default function Page() {
  return <LinksPage />;
}

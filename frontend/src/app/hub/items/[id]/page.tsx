import type { Metadata } from "next";
import { ItemDetail } from "@/features/hub/components/ItemDetail";

export async function generateMetadata({
  params,
}: PageProps<"/hub/items/[id]">): Promise<Metadata> {
  return { title: (await params).id };
}

export default async function HubItemPage({ params }: PageProps<"/hub/items/[id]">) {
  return <ItemDetail id={(await params).id} />;
}

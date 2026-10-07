import type { Metadata } from "next";
import { Suspense } from "react";
import { ItemList } from "@/features/hub/components/ItemList";

export const metadata: Metadata = { title: "Items" };

export default function ItemsPage() {
  return (
    <Suspense>
      <ItemList />
    </Suspense>
  );
}

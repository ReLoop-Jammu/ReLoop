import type { ReactNode } from "react";
import type { ShopItem } from "../model";
import { ItemCard } from "./ItemCard";

export function ItemGrid({ items, empty }: { items: ShopItem[]; empty?: ReactNode }) {
  if (items.length === 0) return <>{empty}</>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5" role="list">
      {items.map((item, i) => (
        <li key={item.id} className="flex">
          <ItemCard item={item} index={i} />
        </li>
      ))}
    </ul>
  );
}

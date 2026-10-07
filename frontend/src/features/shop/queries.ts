import "server-only";
import snapshot from "@/data/shop-snapshot.json";
import { shopSnapshotSchema, type ShopFilters, type ShopItem } from "./model";

/*
 * Read side of the public shop. Pages call ONLY these functions.
 * Today they read the stock file published from the hub
 * (src/data/shop-snapshot.json); with Supabase they will query listed items.
 */

const data = shopSnapshotSchema.parse(snapshot);

export function filterShopItems(items: readonly ShopItem[], f: ShopFilters): ShopItem[] {
  const terms = f.q?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  const list = items.filter((i) => {
    const hay =
      `${i.id} ${i.title} ${i.description} ${i.category} ${i.partType ?? ""}`.toLowerCase();
    return (
      terms.every((t) => hay.includes(t)) &&
      (!f.grade || i.grade === f.grade) &&
      (!f.category || i.category === f.category)
    );
  });
  switch (f.sort) {
    case "price_asc":
      return list.sort((a, b) => a.pricePaise - b.pricePaise);
    case "price_desc":
      return list.sort((a, b) => b.pricePaise - a.pricePaise);
    default:
      return list.sort((a, b) => b.listedAt.localeCompare(a.listedAt));
  }
}

export async function getShopItems(
  f: ShopFilters = {},
): Promise<{ items: ShopItem[]; total: number }> {
  return { items: filterShopItems(data.items, f), total: data.items.length };
}

export async function getShopItem(id: string): Promise<ShopItem | null> {
  return data.items.find((i) => i.id === id) ?? null;
}

export async function getLatestShopItems(limit = 8): Promise<ShopItem[]> {
  return filterShopItems(data.items, {}).slice(0, limit);
}

export async function getRelatedShopItems(item: ShopItem, limit = 4): Promise<ShopItem[]> {
  return data.items.filter((i) => i.id !== item.id && i.category === item.category).slice(0, limit);
}

export async function getAllShopIds(): Promise<string[]> {
  return data.items.map((i) => i.id);
}

export async function isSampleStock(): Promise<boolean> {
  return data.items.length > 0 && data.items.every((i) => i.sample);
}

import "server-only";

import { cache } from "react";
import snapshotJson from "@/data/shop-snapshot.json";
import { BUSINESS_RULES } from "@/config/business-rules";
import {
  CATEGORIES,
  shipsAcrossIndia,
  type Category,
  type PartType,
} from "@/features/inventory/model";
import { supabaseConfig } from "@/lib/server/config";
import { shopSnapshotSchema, type ShopFilters, type ShopItem } from "./model";

/*
 * Where the public shop gets its stock:
 *  1. The hub's `items` table in Supabase (anonymous read access is limited by
 *     Row Level Security to items on sale and to public columns only).
 *  2. If Supabase isn't connected, or can't be reached, the stock file the hub
 *     exports (src/data/shop-snapshot.json), so the shop never goes blank.
 * Every field shown comes from the item itself: nothing is assumed.
 */

type ItemRow = {
  id: string;
  category: string;
  part_type: string | null;
  grade: string | null;
  brand: string | null;
  model: string | null;
  description: string | null;
  checklist: Record<string, unknown> | null;
  wiped_at: string | null;
  list_paise: number | string | null;
  current_paise: number | string | null;
  price_cut_at: string | null;
  status: string;
  listed_at: string | null;
  item_photos: Array<{ position: number; storage_path: string }> | null;
};

const SELECT = [
  "id",
  "category",
  "part_type",
  "grade",
  "brand",
  "model",
  "description",
  "checklist",
  "wiped_at",
  "list_paise",
  "current_paise",
  "price_cut_at",
  "status",
  "listed_at",
  "item_photos(position,storage_path)",
].join(",");

const CATEGORY_VALUES = new Set<string>(CATEGORIES.map((c) => c.value));

export function rowToShopItem(row: ItemRow, storageBase: string): ShopItem | null {
  const price = Number(row.current_paise);
  if (
    row.status !== "listed" ||
    !row.listed_at ||
    !Number.isInteger(price) ||
    price <= 0 ||
    (row.grade !== "A" && row.grade !== "B" && row.grade !== "C") ||
    !CATEGORY_VALUES.has(row.category)
  ) {
    return null;
  }

  const category = row.category as Category;
  const partType = (row.part_type ?? undefined) as PartType | undefined;
  const listPaise = Number(row.list_paise);
  const photo = [...(row.item_photos ?? [])].sort((a, b) => a.position - b.position)[0];
  const warranty =
    (BUSINESS_RULES.warrantyGrades as readonly string[]).includes(row.grade) &&
    category !== "part";

  return {
    id: row.id,
    title: [row.brand, row.model].filter(Boolean).join(" ") || "Untitled item",
    category,
    ...(partType && { partType }),
    grade: row.grade,
    pricePaise: price,
    ...(row.price_cut_at && Number.isInteger(listPaise) && listPaise > 0 && { wasPaise: listPaise }),
    description: row.description ?? "",
    ...(photo && {
      photo: `${storageBase}/storage/v1/object/public/item-photos/${photo.storage_path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
    }),
    checks: Object.entries(row.checklist ?? {})
      .filter(([, ok]) => ok === true)
      .map(([name]) => name),
    dataWiped: Boolean(row.wiped_at),
    warrantyDays: warranty ? BUSINESS_RULES.warrantyDays : null,
    shipsIndia: shipsAcrossIndia({ category, partType }),
    listedAt: row.listed_at,
  };
}

async function loadLive(): Promise<ShopItem[] | null> {
  const config = supabaseConfig();
  if (!config?.publishableKey) return null;

  try {
    const response = await fetch(
      `${config.url}/rest/v1/items?select=${SELECT}&status=eq.listed&order=listed_at.desc&limit=500`,
      {
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${config.publishableKey}`,
        },
        // New stock and the day-45 price cuts show up within a minute.
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) {
      console.error("Shop stock request failed:", response.status);
      return null;
    }
    const rows = (await response.json()) as ItemRow[];
    return rows
      .map((row) => rowToShopItem(row, config.url))
      .filter((item): item is ShopItem => item !== null);
  } catch (error) {
    console.error("Shop stock request error:", error);
    return null;
  }
}

function loadSnapshot(): ShopItem[] {
  return shopSnapshotSchema.parse(snapshotJson).items;
}

const getStock = cache(async (): Promise<{ items: ShopItem[]; live: boolean }> => {
  const live = await loadLive();
  if (live) return { items: live, live: true };
  return { items: loadSnapshot(), live: false };
});

export function filterShopItems(items: readonly ShopItem[], f: ShopFilters): ShopItem[] {
  const terms = f.q?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];

  const list = items.filter((item) => {
    const hay =
      `${item.id} ${item.title} ${item.description} ${item.category} ${item.partType ?? ""}`.toLowerCase();

    return (
      terms.every((term) => hay.includes(term)) &&
      (!f.grade || item.grade === f.grade) &&
      (!f.category || item.category === f.category)
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
  const { items } = await getStock();
  return { items: filterShopItems(items, f), total: items.length };
}

export async function getShopItem(id: string): Promise<ShopItem | null> {
  const { items } = await getStock();
  const wanted = id.toUpperCase();
  return items.find((item) => item.id === wanted) ?? null;
}

export async function getLatestShopItems(limit = 8): Promise<ShopItem[]> {
  const { items } = await getStock();
  return filterShopItems(items, {}).slice(0, limit);
}

export async function getRelatedShopItems(item: ShopItem, limit = 4): Promise<ShopItem[]> {
  const { items } = await getStock();
  return items
    .filter((candidate) => candidate.id !== item.id && candidate.category === item.category)
    .slice(0, limit);
}

export async function getAllShopIds(): Promise<string[]> {
  const { items } = await getStock();
  return items.map((item) => item.id);
}

/** True while the shop is showing the illustrative stock file rather than real stock. */
export async function isSampleStock(): Promise<boolean> {
  const { items, live } = await getStock();
  return !live && items.some((item) => item.sample);
}

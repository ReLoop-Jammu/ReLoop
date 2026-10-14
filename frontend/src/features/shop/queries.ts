import "server-only";

import { inspectionFromRow } from "@/features/inventory/inspection";

import { cache } from "react";
import snapshot from "@/data/shop-snapshot.json";
import { allPages } from "@/lib/pages";
import { shipsAcrossIndia, type Item } from "@/features/inventory/model";
import {
  itemSaving,
  SHOP_PAGE_SIZE,
  shopSnapshotSchema,
  toShopItem,
  type ShopFilters,
  type ShopItem,
} from "./model";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/*
 * GitHub Actions (CI=true) builds and runs the browser tests without Supabase,
 * so there the shop shows the sample stock file instead. Everywhere else
 * (production, preview, local) missing variables still fail loudly. Vercel's
 * own builds set CI=1 and VERCEL=1, so they never take this path.
 */
const USE_SAMPLE_STOCK =
  (!SUPABASE_URL || !SUPABASE_KEY) && process.env.CI === "true" && !process.env.VERCEL;

export type SupabaseListing = {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  brand: string | null;
  model: string | null;
  condition: string;
  price: number;
  stock: number;
  image_url: string | null;
  status: string;
  featured: boolean;
  grade: "A" | "B" | "C" | "D" | null;
  created_at: string;
  is_sample: boolean;
};

export type SupabaseCategory = {
  id: number;
  name: string;
};

type ShopData = {
  listings: SupabaseListing[];
  categories: SupabaseCategory[];
};

async function supabaseFetch<T>(path: string, headers: Record<string, string> = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase environment variables are missing. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

async function getShopData(): Promise<ShopData> {
  const [listings, categories] = await Promise.all([
    supabaseFetch<SupabaseListing[]>(
      "listings?select=id,title,description,category_id,brand,model,condition,price,stock,image_url,status,featured,grade,created_at,is_sample&status=eq.Active&stock=gt.0&order=created_at.desc",
    ),
    supabaseFetch<SupabaseCategory[]>("categories?select=id,name&order=name.asc"),
  ]);

  return { listings, categories };
}

function categoryFromDatabase(
  categoryId: number | null,
  categories: SupabaseCategory[],
): ShopItem["category"] {
  const categoryName =
    categories.find((category) => category.id === categoryId)?.name.toLowerCase() ?? "";

  if (categoryName.includes("mobile") || categoryName.includes("phone")) {
    return "phone";
  }

  if (categoryName.includes("laptop")) {
    return "laptop";
  }

  if (categoryName.includes("desktop")) {
    return "desktop";
  }

  if (categoryName.includes("monitor")) {
    return "monitor";
  }

  if (categoryName.includes("printer")) {
    return "printer";
  }

  if (categoryName.includes("ups")) {
    return "ups";
  }

  if (
    categoryName.includes("accessor") ||
    categoryName.includes("charger") ||
    categoryName.includes("cable")
  ) {
    return "accessory";
  }

  if (categoryName.includes("component") || categoryName.includes("part")) {
    return "part";
  }

  if (categoryName.includes("appliance") || categoryName.includes("electronics")) {
    return "small_appliance";
  }

  if (categoryName.includes("tv") || categoryName.includes("television")) {
    return "tv";
  }

  return "accessory";
}

/** A live listing as the shop shows it (exported for tests). */
export function listingToShopItem(
  listing: SupabaseListing,
  categories: SupabaseCategory[],
): ShopItem | null {
  // Only A/B/C items can appear in the public shop.
  if (
    listing.status !== "Active" ||
    listing.stock <= 0 ||
    !listing.grade ||
    !["A", "B", "C"].includes(listing.grade)
  ) {
    return null;
  }

  const category = categoryFromDatabase(listing.category_id, categories);
  return {
    id: `RL-JMU-${String(listing.id).padStart(4, "0")}`,
    title:
      listing.title ||
      [listing.brand, listing.model].filter(Boolean).join(" ") ||
      "Electronics item",
    category,
    grade: listing.grade as "A" | "B" | "C",
    pricePaise: Math.round(Number(listing.price) * 100),
    description: listing.description ?? "",
    ...(listing.image_url ? { photo: listing.image_url } : {}),
    checks: [],
    dataWiped: false,
    warrantyDays: null,
    // Only laptops and boards ship outside Jammu (business plan; /warranty).
    shipsIndia: shipsAcrossIndia({ category, partType: undefined }),
    listedAt: listing.created_at,
    sample: listing.is_sample === true,
  };
}

/** The shop-facing columns of a hub item: all that visitors may read (see 20261018000001). */
export type PublicHubItem = {
  id: string;
  category: Item["category"];
  part_type: Item["partType"] | null;
  grade: Item["grade"];
  brand: string;
  model: string;
  description: string;
  checklist: Record<string, boolean>;
  wiped_at: string | null;
  wipe_required: boolean;
  wipe_method: Item["dataWipe"]["method"] | null;
  inspection: unknown;
  inspected_at: string | null;
  list_paise: number | null;
  current_paise: number | null;
  price_cut_at: string | null;
  status: Item["status"];
  listed_at: string | null;
  item_photos: { position: number; storage_path: string }[];
};

const HUB_ITEM_SELECT =
  "id,category,part_type,grade,brand,model,description,checklist,wiped_at,wipe_required,wipe_method,inspection,inspected_at,list_paise,current_paise,price_cut_at,status,listed_at,item_photos(position,storage_path)";

/** A listed hub item as the shop shows it (exported for tests). */
export function hubItemToShopItem(row: PublicHubItem, photoBase: string): ShopItem | null {
  const photos = [...(row.item_photos ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((p) => `${photoBase}/${p.storage_path}`);
  return toShopItem({
    id: row.id,
    category: row.category,
    ...(row.part_type && { partType: row.part_type }),
    grade: row.grade,
    brand: row.brand,
    model: row.model,
    description: row.description,
    checklist: row.checklist ?? {},
    dataWipe: {
      required: Boolean(row.wipe_required),
      ...(row.wiped_at && { doneAt: row.wiped_at }),
      ...(row.wipe_method && { method: row.wipe_method }),
    },
    inspection: inspectionFromRow(row.inspection),
    ...(row.inspected_at && { inspectedAt: row.inspected_at }),
    listPaise: row.list_paise === null ? null : Number(row.list_paise),
    currentPaise: row.current_paise === null ? null : Number(row.current_paise),
    ...(row.price_cut_at && { priceCutAt: row.price_cut_at }),
    status: row.status,
    ...(row.listed_at && { listedAt: row.listed_at }),
    photos,
  } as Item);
}

async function getHubItems(): Promise<ShopItem[]> {
  // Every page: one request returns at most 1,000 rows.
  const [rows, prices] = await Promise.all([
    allPages((headers) =>
      supabaseFetch<PublicHubItem[]>(
        `items?select=${HUB_ITEM_SELECT}&status=eq.listed&order=listed_at.desc,id`,
        headers,
      ),
    ),
    allPages((headers) =>
      supabaseFetch<{ item_id: string; new_price_paise: number | null }[]>(
        "public_price_bands?select=item_id,new_price_paise&new_price_paise=not.is.null&order=item_id",
        headers,
      ),
    ).catch(() => []),
  ]);
  const newPrice = new Map(prices.map((p) => [p.item_id, Number(p.new_price_paise)]));
  const photoBase = `${SUPABASE_URL}/storage/v1/object/public/item-photos`;
  return rows
    .map((row) => hubItemToShopItem(row, photoBase))
    .filter((item): item is ShopItem => item !== null)
    .map((item) =>
      newPrice.has(item.id) ? { ...item, newPricePaise: newPrice.get(item.id) } : item,
    );
}

/**
 * Listed hub items and live listings. Sample listings show only while there
 * is no real stock, so they disappear by themselves once the hub lists items.
 */
// One load per request, shared by the page, its metadata and related items.
const getAllPublicShopItems = cache(async (): Promise<ShopItem[]> => {
  if (USE_SAMPLE_STOCK) return shopSnapshotSchema.parse(snapshot).items;

  const [{ listings, categories }, hubItems] = await Promise.all([getShopData(), getHubItems()]);
  const fromListings = listings
    .map((listing) => listingToShopItem(listing, categories))
    .filter((item): item is ShopItem => item !== null);
  return combineStock(hubItems, fromListings);
});

/**
 * Real stock if there is any; otherwise the sample listings (exported for
 * tests). A listing whose shop ID equals a hub item's tag is dropped: hub tags
 * win, so an ID always leads to exactly one item.
 */
export function combineStock(hubItems: ShopItem[], fromListings: ShopItem[]): ShopItem[] {
  const hubIds = new Set(hubItems.map((i) => i.id));
  const listings = fromListings.filter((i) => !hubIds.has(i.id));
  const real = [...hubItems, ...listings.filter((i) => !i.sample)];
  return real.length > 0 ? real : listings;
}

export function filterShopItems(items: readonly ShopItem[], f: ShopFilters): ShopItem[] {
  const terms = f.q?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  const brand = f.brand?.toLowerCase();

  const list = items.filter((item) => {
    const hay =
      `${item.id} ${item.title} ${item.brand ?? ""} ${item.description} ${item.category} ${
        item.partType ?? ""
      }`.toLowerCase();

    return (
      terms.every((term) => hay.includes(term)) &&
      (!f.grade || item.grade === f.grade) &&
      (!f.category || item.category === f.category) &&
      (!brand || (item.brand ?? "").toLowerCase() === brand) &&
      (f.min === undefined || item.pricePaise >= f.min * 100) &&
      (f.max === undefined || item.pricePaise <= f.max * 100)
    );
  });

  switch (f.sort) {
    case "price_asc":
      return list.sort((a, b) => a.pricePaise - b.pricePaise);

    case "price_desc":
      return list.sort((a, b) => b.pricePaise - a.pricePaise);

    case "saving":
      return list.sort(
        (a, b) => itemSaving(b) - itemSaving(a) || b.listedAt.localeCompare(a.listedAt),
      );

    default:
      return list.sort((a, b) => b.listedAt.localeCompare(a.listedAt));
  }
}

/** Brands to filter by, from the stock (in the chosen category, if any). */
export function brandsIn(items: readonly ShopItem[], category?: ShopFilters["category"]): string[] {
  const seen = new Map<string, string>();
  for (const i of items)
    if (i.brand && (!category || i.category === category) && !seen.has(i.brand.toLowerCase()))
      seen.set(i.brand.toLowerCase(), i.brand);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export type ShopPage = {
  items: ShopItem[];
  /** Every item on sale, and those matching the filters. */
  total: number;
  matching: number;
  page: number;
  pages: number;
  brands: string[];
};

export async function getShopItems(f: ShopFilters = {}): Promise<ShopPage> {
  const items = await getAllPublicShopItems();
  const filtered = filterShopItems(items, f);
  const pages = Math.max(1, Math.ceil(filtered.length / SHOP_PAGE_SIZE));
  const page = Math.min(f.page ?? 1, pages);
  return {
    items: filtered.slice((page - 1) * SHOP_PAGE_SIZE, page * SHOP_PAGE_SIZE),
    total: items.length,
    matching: filtered.length,
    page,
    pages,
    brands: brandsIn(items, f.category),
  };
}

/** Items by their IDs, in that order, skipping any that aren't on sale (for the compare page). */
export async function getShopItemsByIds(ids: readonly string[]): Promise<ShopItem[]> {
  const items = await getAllPublicShopItems();
  return ids.map((id) => items.find((i) => i.id === id)).filter((i): i is ShopItem => Boolean(i));
}

export async function getShopItem(id: string): Promise<ShopItem | null> {
  const items = await getAllPublicShopItems();

  return (
    items.find((item) => item.id === id || item.id === `RL-JMU-${String(id).padStart(4, "0")}`) ??
    null
  );
}

export async function getLatestShopItems(limit = 8): Promise<ShopItem[]> {
  const items = await getAllPublicShopItems();

  return filterShopItems(items, {}).slice(0, limit);
}

export async function getRelatedShopItems(item: ShopItem, limit = 4): Promise<ShopItem[]> {
  const items = await getAllPublicShopItems();

  return items
    .filter((candidate) => candidate.id !== item.id && candidate.category === item.category)
    .slice(0, limit);
}

export async function getAllShopIds(): Promise<string[]> {
  const items = await getAllPublicShopItems();

  return items.map((item) => item.id);
}

/** True while everything in the shop is a sample (CI's sample file, or sample listings live). */
export async function isSampleStock(): Promise<boolean> {
  if (USE_SAMPLE_STOCK) return true;
  const items = await getAllPublicShopItems();
  return items.length > 0 && items.every((item) => item.sample);
}

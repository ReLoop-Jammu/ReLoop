import "server-only";

import {
  shopSnapshotSchema,
  type ShopFilters,
  type ShopItem,
} from "./model";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SupabaseListing = {
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
};

type SupabaseCategory = {
  id: number;
  name: string;
};

type ShopData = {
  listings: SupabaseListing[];
  categories: SupabaseCategory[];
};

async function supabaseFetch<T>(path: string): Promise<T> {
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
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase request failed (${response.status}): ${errorText}`,
    );
  }

  return response.json() as Promise<T>;
}

async function getShopData(): Promise<ShopData> {
  const [listings, categories] = await Promise.all([
    supabaseFetch<SupabaseListing[]>(
      "listings?select=id,title,description,category_id,brand,model,condition,price,stock,image_url,status,featured,grade,created_at&status=eq.Active&stock=gt.0&order=created_at.desc",
    ),
    supabaseFetch<SupabaseCategory[]>(
      "categories?select=id,name&order=name.asc",
    ),
  ]);

  return { listings, categories };
}

function categoryFromDatabase(
  categoryId: number | null,
  categories: SupabaseCategory[],
): ShopItem["category"] {
  const categoryName =
    categories.find((category) => category.id === categoryId)?.name.toLowerCase() ??
    "";

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

  if (
    categoryName.includes("component") ||
    categoryName.includes("part")
  ) {
    return "part";
  }

  if (
    categoryName.includes("appliance") ||
    categoryName.includes("electronics")
  ) {
    return "small_appliance";
  }

  if (categoryName.includes("tv") || categoryName.includes("television")) {
    return "tv";
  }

  return "accessory";
}

function toShopItem(
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

  return {
    id: `RL-JMU-${String(listing.id).padStart(4, "0")}`,
    title:
      listing.title ||
      [listing.brand, listing.model].filter(Boolean).join(" ") ||
      "Electronics item",
    category: categoryFromDatabase(listing.category_id, categories),
    grade: listing.grade,
    pricePaise: Math.round(Number(listing.price) * 100),
    description: listing.description ?? "",
    ...(listing.image_url ? { photo: listing.image_url } : {}),
    checks: [],
    dataWiped: false,
    warrantyDays: null,
    shipsIndia: true,
    listedAt: listing.created_at,
    sample: false,
  };
}

async function getAllPublicShopItems(): Promise<ShopItem[]> {
  const { listings, categories } = await getShopData();

  return listings
    .map((listing) => toShopItem(listing, categories))
    .filter((item): item is ShopItem => item !== null);
}

export function filterShopItems(
  items: readonly ShopItem[],
  f: ShopFilters,
): ShopItem[] {
  const terms = f.q?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];

  const list = items.filter((item) => {
    const hay =
      `${item.id} ${item.title} ${item.description} ${item.category} ${
        item.partType ?? ""
      }`.toLowerCase();

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
      return list.sort(
        (a, b) => b.listedAt.localeCompare(a.listedAt),
      );
  }
}

export async function getShopItems(
  f: ShopFilters = {},
): Promise<{ items: ShopItem[]; total: number }> {
  const items = await getAllPublicShopItems();
  const filtered = filterShopItems(items, f);

  return {
    items: filtered,
    total: items.length,
  };
}

export async function getShopItem(
  id: string,
): Promise<ShopItem | null> {
  const items = await getAllPublicShopItems();

  return (
    items.find(
      (item) =>
        item.id === id ||
        item.id === `RL-JMU-${String(id).padStart(4, "0")}`,
    ) ?? null
  );
}

export async function getLatestShopItems(
  limit = 8,
): Promise<ShopItem[]> {
  const items = await getAllPublicShopItems();

  return filterShopItems(items, {}).slice(0, limit);
}

export async function getRelatedShopItems(
  item: ShopItem,
  limit = 4,
): Promise<ShopItem[]> {
  const items = await getAllPublicShopItems();

  return items
    .filter(
      (candidate) =>
        candidate.id !== item.id &&
        candidate.category === item.category,
    )
    .slice(0, limit);
}

export async function getAllShopIds(): Promise<string[]> {
  const items = await getAllPublicShopItems();

  return items.map((item) => item.id);
}

export async function isSampleStock(): Promise<boolean> {
  // Real Supabase inventory is never sample inventory.
  return false;
}

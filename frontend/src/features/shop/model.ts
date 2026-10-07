import { z } from "zod";
import { BUSINESS_RULES } from "@/config/business-rules";
import {
  CATEGORIES,
  shipsAcrossIndia,
  type Category,
  type Item,
  type PartType,
} from "@/features/inventory/model";

/**
 * What the public shop may show about an item. Built from a hub Item by
 * toShopItem(): buy price, source and internal notes never leave the hub.
 */
export type ShopItem = {
  id: string;
  title: string;
  category: Category;
  partType?: PartType;
  grade: "A" | "B" | "C";
  pricePaise: number;
  /** Price before the day-45 cut, if one was applied. */
  wasPaise?: number;
  description: string;
  photo?: string;
  checks: string[];
  dataWiped: boolean;
  warrantyDays: number | null;
  shipsIndia: boolean;
  listedAt: string;
  /** True for illustrative items shown before real stock exists. */
  sample?: boolean;
};

export type ShopSnapshot = { publishedAt: string; items: ShopItem[] };

export function toShopItem(item: Item): ShopItem | null {
  if (item.status !== "listed" || !item.currentPaise || !item.listedAt) return null;
  if (item.grade !== "A" && item.grade !== "B" && item.grade !== "C") return null;
  const warranty =
    (BUSINESS_RULES.warrantyGrades as readonly string[]).includes(item.grade) &&
    item.category !== "part";
  return {
    id: item.id,
    title: [item.brand, item.model].filter(Boolean).join(" ") || "Untitled item",
    category: item.category,
    ...(item.partType && { partType: item.partType }),
    grade: item.grade,
    pricePaise: item.currentPaise,
    ...(item.priceCutAt && item.listPaise && { wasPaise: item.listPaise }),
    description: item.description,
    ...(item.photos[0] && { photo: item.photos[0] }),
    checks: Object.entries(item.checklist)
      .filter(([, ok]) => ok)
      .map(([name]) => name),
    dataWiped: Boolean(item.dataWipe.doneAt),
    warrantyDays: warranty ? BUSINESS_RULES.warrantyDays : null,
    shipsIndia: shipsAcrossIndia(item),
    listedAt: item.listedAt,
  };
}

// ---------------------------------------------------------------- URL filters

const categoryValues = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];
export const SHOP_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;
type Sort = (typeof SHOP_SORTS)[number]["value"];

const first = z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.string().optional());

const filtersSchema = z.object({
  q: first.transform((v) => v?.trim().slice(0, 100) || undefined),
  grade: first.pipe(z.enum(["A", "B", "C"]).optional()).catch(undefined),
  category: first.pipe(z.enum(categoryValues).optional()).catch(undefined),
  sort: first.pipe(z.enum(["newest", "price_asc", "price_desc"]).optional()).catch(undefined),
});

export type ShopFilters = { q?: string; grade?: "A" | "B" | "C"; category?: Category; sort?: Sort };

export function parseShopFilters(
  params: Record<string, string | string[] | undefined>,
): ShopFilters {
  return filtersSchema.parse(params);
}

export function shopHref(filters: ShopFilters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
  const qs = p.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

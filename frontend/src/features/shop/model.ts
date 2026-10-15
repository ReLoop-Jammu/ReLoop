import { z } from "zod";
import { BUSINESS_RULES } from "@/config/business-rules";
import { CATEGORIES, type Category, type Item, type PartType } from "@/features/inventory/model";

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
  /** Every photo, in order (the first is `photo`). */
  photos?: string[];
  /** For the brand filter (hub items; empty for listings). */
  brand?: string;
  /** Price new, when ReLoop recorded a fresh one (for the "biggest saving" sort). */
  newPricePaise?: number;
  checks: string[];
  dataWiped: boolean;
  warrantyDays: number | null;
  listedAt: string;
  /** The ReLoop Checked report: what the hub inspection found (absent for samples). */
  report?: ShopReport;
  /** True for illustrative items shown before real stock exists. */
  sample?: boolean;
  /** True for hub stock (the items table): the only items that can be saved. */
  hub?: boolean;
  /** A part a partner shop listed on the Parts Exchange, if the shop agreed to be named. */
  listedBy?: { name: string; market?: string };
};

export type ShopReport = {
  inspectedAt: string;
  checks: { name: string; result: "pass" | "fail" | "na" }[];
  batteryHealthPct?: number;
  storageHealthPct?: number;
  /** Whether the item can hold personal data, and when and how it was wiped. */
  wipeRequired: boolean;
  wipedAt?: string;
  wipeMethod?: "reset_overwrite" | "drive_wipe" | "drilled";
};

export type ShopSnapshot = { publishedAt: string; items: ShopItem[] };

const itemIdPattern = /^RL-[A-Z]{3}-\d{4,}$/;

/**
 * Schema for the stock file exported from the hub. Parsed at build time so a
 * damaged or hand-edited file fails the build instead of breaking the shop.
 */
export const shopSnapshotSchema = z.object({
  publishedAt: z.iso.datetime(),
  items: z
    .array(
      z.object({
        id: z.string().regex(itemIdPattern),
        title: z.string().min(1).max(120),
        category: z.enum(CATEGORIES.map((c) => c.value) as [Category, ...Category[]]),
        partType: z
          .enum(["screen", "board", "ram", "storage", "battery", "charger", "motor", "other"])
          .optional(),
        grade: z.enum(["A", "B", "C"]),
        pricePaise: z.number().int().positive(),
        wasPaise: z.number().int().positive().optional(),
        description: z.string().max(2000),
        photo: z.string().startsWith("data:image/").or(z.string().startsWith("/")).optional(),
        photos: z
          .array(z.string().startsWith("data:image/").or(z.string().startsWith("/")))
          .optional(),
        brand: z.string().max(40).optional(),
        newPricePaise: z.number().int().positive().optional(),
        checks: z.array(z.string().max(60)),
        dataWiped: z.boolean(),
        warrantyDays: z.number().int().positive().nullable(),
        listedAt: z.iso.datetime(),
        report: z
          .object({
            inspectedAt: z.iso.datetime(),
            checks: z.array(
              z.object({ name: z.string().max(60), result: z.enum(["pass", "fail", "na"]) }),
            ),
            batteryHealthPct: z.number().min(0).max(100).optional(),
            storageHealthPct: z.number().min(0).max(100).optional(),
            wipeRequired: z.boolean(),
            wipedAt: z.iso.datetime().optional(),
            wipeMethod: z.enum(["reset_overwrite", "drive_wipe", "drilled"]).optional(),
          })
          .optional(),
        sample: z.boolean().optional(),
      }),
    )
    .refine(
      (items) => new Set(items.map((i) => i.id)).size === items.length,
      "Duplicate item IDs in stock file",
    ),
}) satisfies z.ZodType<ShopSnapshot>;

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
    ...(item.photos[0] && { photo: item.photos[0], photos: item.photos }),
    ...(item.brand && { brand: item.brand }),
    checks: item.inspection
      ? Object.entries(item.inspection.checks)
          .filter(([, r]) => r === "pass")
          .map(([name]) => name)
      : Object.entries(item.checklist)
          .filter(([, ok]) => ok)
          .map(([name]) => name),
    dataWiped: Boolean(item.dataWipe.doneAt),
    ...(item.inspection &&
      item.inspectedAt && {
        report: {
          inspectedAt: item.inspectedAt,
          checks: Object.entries(item.inspection.checks).map(([name, result]) => ({
            name,
            result,
          })),
          ...(item.inspection.batteryHealthPct !== undefined && {
            batteryHealthPct: item.inspection.batteryHealthPct,
          }),
          ...(item.inspection.storageHealthPct !== undefined && {
            storageHealthPct: item.inspection.storageHealthPct,
          }),
          wipeRequired: item.dataWipe.required,
          ...(item.dataWipe.doneAt && { wipedAt: item.dataWipe.doneAt }),
          ...(item.dataWipe.method && { wipeMethod: item.dataWipe.method }),
        },
      }),
    warrantyDays: warranty ? BUSINESS_RULES.warrantyDays : null,
    listedAt: item.listedAt,
  };
}

// ---------------------------------------------------------------- URL filters

const categoryValues = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];
export const SHOP_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "saving", label: "Biggest saving" },
] as const;
type Sort = (typeof SHOP_SORTS)[number]["value"];
export const SHOP_PAGE_SIZE = 24;

const first = z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.string().optional());
const rupees = first
  .transform((v) => (v && /^\d{1,7}$/.test(v.trim()) ? Number(v.trim()) : undefined))
  .catch(undefined);

const filtersSchema = z.object({
  q: first.transform((v) => v?.trim().slice(0, 100) || undefined),
  grade: first.pipe(z.enum(["A", "B", "C"]).optional()).catch(undefined),
  kind: first.pipe(z.enum(["devices", "parts"]).optional()).catch(undefined),
  category: first.pipe(z.enum(categoryValues).optional()).catch(undefined),
  brand: first.transform((v) => v?.trim().slice(0, 40) || undefined),
  min: rupees,
  max: rupees,
  sort: first
    .pipe(z.enum(["newest", "price_asc", "price_desc", "saving"]).optional())
    .catch(undefined),
  page: first
    .transform((v) => (v && /^\d{1,4}$/.test(v) && Number(v) > 1 ? Number(v) : undefined))
    .catch(undefined),
});

export type ShopFilters = {
  q?: string;
  grade?: "A" | "B" | "C";
  /** Devices (the default) or the Parts Exchange: parts are shown apart from refurbished devices. */
  kind?: "devices" | "parts";
  category?: Category;
  brand?: string;
  /** Price range in rupees. */
  min?: number;
  max?: number;
  sort?: Sort;
  page?: number;
};

export function parseShopFilters(
  params: Record<string, string | string[] | undefined>,
): ShopFilters {
  return filtersSchema.parse(params);
}

/** A shop address with these filters (page 1 is left out). */
export function shopHref(filters: ShopFilters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters))
    if (v !== undefined && v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
  const qs = p.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

/** What a buyer saves on the item: against its price new, or its own price cut (whichever is larger). */
export function itemSaving(
  item: Pick<ShopItem, "pricePaise" | "wasPaise" | "newPricePaise">,
): number {
  return Math.max(
    0,
    (item.newPricePaise ?? 0) - item.pricePaise,
    (item.wasPaise ?? 0) - item.pricePaise,
  );
}

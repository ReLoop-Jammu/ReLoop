import { z } from "zod";

/*
 * Listing domain model. Values mirror the Postgres enums planned in
 * docs/architecture.md §4, so the Phase 3 Supabase swap keeps these types.
 */

export const CATEGORIES = [
  {
    value: "devices",
    label: "Used devices",
    short: "Devices",

    blurb: "Laptops, phones, monitors",
  },
  {
    value: "components",
    label: "Components",
    short: "Components",

    blurb: "RAM, SSDs, screens",
  },
  {
    value: "repairable",
    label: "Repairable",
    short: "Repairable",

    blurb: "For repair and salvage",
  },
  {
    value: "bulk_lots",
    label: "Bulk lots",
    short: "Bulk lots",

    blurb: "Business and institutional",
  },
  {
    value: "recycling",
    label: "Recycling",
    short: "Recycling",

    blurb: "Authorised channels only",
  },
] as const;

export const CONDITIONS = [
  { value: "working", label: "Working" },
  { value: "tested", label: "Tested" },
  { value: "repairable", label: "Repairable" },
  { value: "parts_only", label: "Parts only" },
  { value: "end_of_life", label: "End-of-life" },
] as const;

export const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "title", label: "Name: A–Z" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];
export type Condition = (typeof CONDITIONS)[number]["value"];
export type Sort = (typeof SORTS)[number]["value"];

const categoryValues = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];
const conditionValues = CONDITIONS.map((c) => c.value) as [Condition, ...Condition[]];
const sortValues = SORTS.map((s) => s.value) as [Sort, ...Sort[]];

export const LISTING_ICONS = [
  "laptop",
  "memory",
  "wrench",
  "boxes",
  "drive",
  "recycle",
  "monitor",
  "cable",
  "keyboard",
  "battery",
  "printer",
  "smartphone",
] as const;
export type ListingIcon = (typeof LISTING_ICONS)[number];

export type SellerKind = "reloop" | "partner" | "individual";

export type Listing = {
  id: string;
  slug: string;
  title: string;
  category: Category;
  condition: Condition;
  /** Integer paise. `null` = request a quote. */
  pricePaise: number | null;
  quantity: number;
  city: string;
  description: string;
  /** Illustration shown until real photos arrive in Phase 5. */
  icon: ListingIcon;
  seller: { kind: SellerKind; name: string };
  publishedAt: string;
};

/** Pick the first value of a query-string param (Next gives string | string[]). */
const firstString = z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.string().optional());

/**
 * Parses untrusted URL search params into safe filters. Unknown or invalid
 * values are dropped rather than throwing, so a bad link still renders.
 */
export const listingFiltersSchema = z.object({
  q: firstString.transform((v) => v?.trim().slice(0, 100) || undefined),
  category: firstString.pipe(z.enum(categoryValues).optional()).catch(undefined),
  condition: firstString.pipe(z.enum(conditionValues).optional()).catch(undefined),
  sort: firstString.pipe(z.enum(sortValues).optional()).catch(undefined),
});

export type ListingFilters = {
  q?: string;
  category?: Category;
  condition?: Condition;
  sort?: Sort;
};

export function parseListingFilters(
  params: Record<string, string | string[] | undefined>,
): ListingFilters {
  return listingFiltersSchema.parse(params);
}

export function categoryLabel(value: Category): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function conditionLabel(value: Condition): string {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export function isCategory(value: string): value is Category {
  return (categoryValues as string[]).includes(value);
}

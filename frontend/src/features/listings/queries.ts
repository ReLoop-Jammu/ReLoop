import "server-only";
import { SEED_LISTINGS } from "./seed-data";
import { CATEGORIES, type Category, type Listing, type ListingFilters } from "./model";

/*
 * Read side of the listings feature. Pages call ONLY these functions.
 * Phase 3 replaces the bodies with Supabase queries; signatures stay the same.
 */

function matchesQuery(listing: Listing, q: string): boolean {
  const haystack =
    `${listing.title} ${listing.description} ${listing.category} ${listing.city}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function filterAndSortListings(
  listings: readonly Listing[],
  filters: ListingFilters,
): Listing[] {
  const result = listings.filter(
    (l) =>
      (!filters.q || matchesQuery(l, filters.q)) &&
      (!filters.category || l.category === filters.category) &&
      (!filters.condition || l.condition === filters.condition),
  );

  // "Request quote" (null price) sorts after priced items in both directions.
  const price = (l: Listing, fallback: number) => l.pricePaise ?? fallback;
  switch (filters.sort) {
    case "price_asc":
      return result.sort((a, b) => price(a, Infinity) - price(b, Infinity));
    case "price_desc":
      return result.sort((a, b) => price(b, -Infinity) - price(a, -Infinity));
    case "title":
      return result.sort((a, b) => a.title.localeCompare(b.title, "en"));
    case "newest":
      return result.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    default:
      return result;
  }
}

export async function getPublishedListings(
  filters: ListingFilters = {},
): Promise<{ listings: Listing[]; total: number }> {
  return {
    listings: filterAndSortListings(SEED_LISTINGS, filters),
    total: SEED_LISTINGS.length,
  };
}

export async function getFeaturedListings(limit = 8): Promise<Listing[]> {
  return SEED_LISTINGS.slice(0, limit);
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  return SEED_LISTINGS.find((l) => l.slug === slug) ?? null;
}

export async function getRelatedListings(listing: Listing, limit = 4): Promise<Listing[]> {
  return SEED_LISTINGS.filter((l) => l.category === listing.category && l.id !== listing.id).slice(
    0,
    limit,
  );
}

export async function getAllListingSlugs(): Promise<string[]> {
  return SEED_LISTINGS.map((l) => l.slug);
}

export async function getCategoryCounts(): Promise<Record<Category, number>> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.value, 0])) as Record<
    Category,
    number
  >;
  for (const listing of SEED_LISTINGS) counts[listing.category] += 1;
  return counts;
}

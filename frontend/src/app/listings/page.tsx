import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CategoryChips } from "@/features/listings/components/CategoryChips";
import { FilterBar } from "@/features/listings/components/FilterBar";
import { ListingGrid } from "@/features/listings/components/ListingGrid";
import {
  categoryLabel,
  conditionLabel,
  parseListingFilters,
  type ListingFilters,
} from "@/features/listings/model";
import { getPublishedListings } from "@/features/listings/queries";

export async function generateMetadata({
  searchParams,
}: PageProps<"/listings">): Promise<Metadata> {
  const { category } = parseListingFilters(await searchParams);
  const title = category ? `${categoryLabel(category)} for sale` : "All listings";
  return {
    title,
    description:
      "Browse used electronics, components, repairable devices and bulk lots from Jammu.",
    alternates: { canonical: category ? `/listings?category=${category}` : "/listings" },
  };
}

function describeFilters(f: ListingFilters): string[] {
  const parts: string[] = [];
  if (f.q) parts.push(`“${f.q}”`);
  if (f.category) parts.push(categoryLabel(f.category));
  if (f.condition) parts.push(conditionLabel(f.condition));
  return parts;
}

export default async function ListingsPage({ searchParams }: PageProps<"/listings">) {
  const filters = parseListingFilters(await searchParams);
  const { listings, total } = await getPublishedListings(filters);
  const active = describeFilters(filters);

  return (
    <Container className="py-10 sm:py-14">
      {/* Heading, category chips, filters, results */}
      <SectionHeading
        as="h1"
        title={filters.category ? categoryLabel(filters.category) : "All listings"}
        description="Condition-checked electronics, components and bulk lots from Jammu."
        actions={
          <ButtonLink href="/sell" variant="secondary">
            <Plus className="size-4" aria-hidden="true" />
            Sell an item
          </ButtonLink>
        }
      />
      {/* key resets uncontrolled inputs when the URL changes via links. */}
      <CategoryChips filters={filters} />
      <FilterBar key={JSON.stringify(filters)} filters={filters} />
      <p className="mb-4 text-sm text-muted" aria-live="polite">
        Showing {listings.length} of {total} listings
        {active.length > 0 && ` for ${active.join(" · ")}`}
      </p>
      <ListingGrid
        listings={listings}
        empty={
          <EmptyState
            title="No listings found"
            description={
              active.length > 0
                ? `Nothing matches ${active.join(", ")}. Try a different search or clear the filters.`
                : "There are no listings yet. Check back soon."
            }
            actions={
              <>
                {active.length > 0 && (
                  <ButtonLink href="/listings" variant="secondary">
                    Clear filters
                  </ButtonLink>
                )}
                <ButtonLink href="/sell">Sell an item</ButtonLink>
              </>
            }
          />
        }
      />
    </Container>
  );
}

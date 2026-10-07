import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { categoryLabel } from "@/features/inventory/model";
import { GradeChips } from "@/features/shop/components/GradeChips";
import { ItemGrid } from "@/features/shop/components/ItemGrid";
import { SampleStockNotice } from "@/features/shop/components/SampleStockNotice";
import { ShopFilterBar } from "@/features/shop/components/ShopFilterBar";
import { parseShopFilters, type ShopFilters } from "@/features/shop/model";
import { getShopItems, isSampleStock } from "@/features/shop/queries";

export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  const { category } = parseShopFilters(await searchParams);
  return {
    title: category
      ? `Used ${categoryLabel(category, true).toLowerCase()}`
      : "Shop graded electronics",
    description:
      "Tested, graded used electronics and parts from ReLoop's hub in Jammu. Hub pickup or ₹50 delivery in Jammu.",
    alternates: { canonical: category ? `/shop?category=${category}` : "/shop" },
  };
}

function describe(f: ShopFilters): string[] {
  return [
    f.q && `“${f.q}”`,
    f.grade && `grade ${f.grade}`,
    f.category && categoryLabel(f.category, true),
  ].filter((x): x is string => Boolean(x));
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const filters = parseShopFilters(await searchParams);
  const [{ items, total }, sample] = await Promise.all([getShopItems(filters), isSampleStock()]);
  const active = describe(filters);

  return (
    <Container className="py-10 sm:py-14">
      <SectionHeading
        as="h1"
        title={
          filters.category ? `Used ${categoryLabel(filters.category, true).toLowerCase()}` : "Shop"
        }
        description="Every item is tagged, tested and graded at our Jammu hub. Pick up free from the hub or get it delivered in Jammu for ₹50."
      />
      {sample && <SampleStockNotice />}
      <GradeChips filters={filters} />
      <ShopFilterBar key={JSON.stringify(filters)} filters={filters} />
      <p className="mb-5 text-sm text-muted" aria-live="polite">
        Showing {items.length} of {total} items{active.length > 0 && ` for ${active.join(" · ")}`}
      </p>
      <ItemGrid
        items={items}
        empty={
          <EmptyState
            title="Nothing matches yet"
            description={
              active.length
                ? `No items for ${active.join(", ")} right now. New stock is graded every week.`
                : "New stock is graded every week. Check back soon."
            }
            actions={
              active.length ? (
                <ButtonLink href="/shop" variant="secondary">
                  Clear filters
                </ButtonLink>
              ) : undefined
            }
          />
        }
      />
    </Container>
  );
}

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
import { CompareBar } from "@/features/shop/components/CompareBar";
import { Pagination } from "@/features/shop/components/Pagination";
import { RecentlyViewed } from "@/features/shop/components/RecentlyViewed";
import { parseShopFilters, SHOP_PAGE_SIZE, type ShopFilters } from "@/features/shop/model";
import { formatPrice } from "@/lib/utils/money";
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
    f.brand,
    f.min !== undefined && `from ${formatPrice(f.min * 100)}`,
    f.max !== undefined && `up to ${formatPrice(f.max * 100)}`,
  ].filter((x): x is string => Boolean(x));
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const filters = parseShopFilters(await searchParams);
  const [{ items, total, matching, page, pages, brands }, sample] = await Promise.all([
    getShopItems(filters),
    isSampleStock(),
  ]);
  const from = matching ? (page - 1) * SHOP_PAGE_SIZE + 1 : 0;
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
      <ShopFilterBar key={JSON.stringify(filters)} filters={filters} brands={brands} />
      <RecentlyViewed />
      <p className="mb-5 text-sm text-muted" aria-live="polite">
        {matching === 0
          ? `No items${active.length > 0 ? ` for ${active.join(" · ")}` : ""}`
          : `Showing ${from}–${from + items.length - 1} of ${matching}${matching < total ? ` (${total} on sale)` : ""}`}
        {matching > 0 && active.length > 0 && ` for ${active.join(" · ")}`}
      </p>
      {/* Item cards use h3 titles; this keeps the heading order for screen readers. */}
      <h2 className="sr-only">Items</h2>
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
      {pages > 1 && <Pagination filters={filters} page={page} pages={pages} />}
      <CompareBar />
    </Container>
  );
}

import { ArrowLeft, BadgeCheck, Info, MapPin, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ListingGrid } from "@/features/listings/components/ListingGrid";
import { ConditionBadge, ListingVisual } from "@/features/listings/components/visuals";
import { categoryLabel, conditionLabel } from "@/features/listings/model";
import {
  getAllListingSlugs,
  getListingBySlug,
  getRelatedListings,
} from "@/features/listings/queries";
import { env } from "@/lib/env";
import { formatPrice } from "@/lib/utils/money";

export async function generateStaticParams() {
  return (await getAllListingSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/listings/[slug]">): Promise<Metadata> {
  const listing = await getListingBySlug((await params).slug);
  if (!listing) return { title: "Listing not found" };
  return {
    title: listing.title,
    description: `${conditionLabel(listing.condition)} · ${formatPrice(listing.pricePaise)} · ${listing.city}. ${listing.description}`,
    alternates: { canonical: `/listings/${listing.slug}` },
  };
}

export default async function ListingPage({ params }: PageProps<"/listings/[slug]">) {
  const listing = await getListingBySlug((await params).slug);
  if (!listing) notFound();
  const related = await getRelatedListings(listing);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    category: categoryLabel(listing.category),
    url: `${env.NEXT_PUBLIC_SITE_URL}/listings/${listing.slug}`,
    ...(listing.pricePaise !== null && {
      offers: {
        "@type": "Offer",
        price: (listing.pricePaise / 100).toFixed(2),
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        itemCondition:
          listing.condition === "working" || listing.condition === "tested"
            ? "https://schema.org/UsedCondition"
            : "https://schema.org/DamagedCondition",
      },
    }),
  };

  const facts = [
    ["Condition", conditionLabel(listing.condition)],
    ["Category", categoryLabel(listing.category)],
    ["Available", `${listing.quantity} ${listing.quantity === 1 ? "unit" : "units"}`],
    ["Location", listing.city],
  ] as const;

  return (
    <Container className="py-8 sm:py-12">
      <script
        type="application/ld+json"
        // "<" is escaped so listing text can never close this script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <li>
            <Link href="/listings" className="inline-flex items-center gap-1 hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Marketplace
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/listings?category=${listing.category}`} className="hover:text-ink">
              {categoryLabel(listing.category)}
            </Link>
          </li>
          <li aria-hidden="true" className="hidden sm:block">
            /
          </li>
          <li aria-current="page" className="hidden truncate text-ink sm:block">
            {listing.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <ListingVisual
          icon={listing.icon}
          category={listing.category}
          size="hero"
          className="aspect-[16/11] rounded-panel border border-line lg:sticky lg:top-28 lg:aspect-[4/3.4]"
        />

        <div>
          <ConditionBadge condition={listing.condition} />
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{listing.title}</h1>
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-4" aria-hidden="true" />
            {listing.city}
          </p>
          <p className="mt-6 font-display text-4xl font-bold">{formatPrice(listing.pricePaise)}</p>
          {listing.pricePaise === null && (
            <p className="mt-1 text-sm text-muted">Price depends on inspection and quantity.</p>
          )}

          <div className="mt-8 rounded-card border border-line bg-surface p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                <BadgeCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">{listing.seller.name}</p>
                <p className="text-sm text-muted">
                  Verified by ReLoop · condition checked before sale
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-sunken p-4 text-sm leading-relaxed text-ink-soft">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <Package className="size-4" aria-hidden="true" /> Interested in this item?
              </p>
              <p className="mt-1">
                Online inquiries open in an upcoming release. ReLoop confirms availability,
                condition and delivery directly before any purchase.
              </p>
            </div>
          </div>

          <h2 className="mt-10 font-sans text-sm font-semibold tracking-normal text-muted uppercase">
            About this item
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">{listing.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line">
            {facts.map(([term, value]) => (
              <div key={term} className="bg-surface p-4">
                <dt className="text-xs text-muted">{term}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          {listing.category === "recycling" && (
            <p className="mt-6 flex gap-2 rounded-xl bg-cat-recycling-bg p-4 text-sm leading-relaxed text-ink-soft">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              End-of-life e-waste is handled only through authorised channels under the E-Waste
              (Management) Rules, 2022.
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-heading">
          <SectionHeading
            id="related-heading"
            title={`More in ${categoryLabel(listing.category)}`}
          />
          <ListingGrid listings={related} />
        </section>
      )}
    </Container>
  );
}

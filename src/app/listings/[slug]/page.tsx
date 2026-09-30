import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ListingGrid } from "@/features/listings/components/ListingGrid";
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
    ["Quantity available", String(listing.quantity)],
    ["Location", listing.city],
    ["Listed by", listing.seller.name],
  ] as const;

  return (
    <Container className="py-8 sm:py-12">
      <script
        type="application/ld+json"
        // JSON.stringify output is safe here; "<" is escaped to prevent </script> injection.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="text-muted mb-6 text-sm">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/listings" className="hover:text-primary">
              Marketplace
            </Link>{" "}
            /
          </li>
          <li>
            <Link href={`/listings?category=${listing.category}`} className="hover:text-primary">
              {categoryLabel(listing.category)}
            </Link>{" "}
            /
          </li>
          <li aria-current="page" className="text-ink">
            {listing.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
        <div
          className="rounded-panel border-line grid aspect-[16/10] place-items-center border bg-[radial-gradient(circle,rgb(30_107_158/0.12),transparent_70%),var(--color-sunken)] text-[6rem] sm:text-[8rem] lg:aspect-[4/3]"
          aria-hidden="true"
        >
          {listing.emoji}
        </div>
        <div>
          <Eyebrow>
            {conditionLabel(listing.condition)} · {categoryLabel(listing.category)}
          </Eyebrow>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{listing.title}</h1>
          <p className="text-primary mt-4 text-3xl font-black">{formatPrice(listing.pricePaise)}</p>
          <p className="text-muted mt-4 leading-relaxed">{listing.description}</p>

          <dl className="rounded-card bg-sunken mt-6 grid gap-x-6 gap-y-3 p-5 sm:grid-cols-2">
            {facts.map(([term, value]) => (
              <div key={term}>
                <dt className="text-muted text-[11px] font-extrabold tracking-wider uppercase">
                  {term}
                </dt>
                <dd className="mt-0.5 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="rounded-card border-accent/60 bg-accent/10 mt-6 border p-5">
            <h2 className="text-base font-extrabold">Interested in this item?</h2>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              Online inquiries open in an upcoming release. Until then, ReLoop confirms
              availability, condition and delivery directly before any purchase.
            </p>
          </div>
          {listing.category === "recycling" && (
            <p className="text-muted mt-4 text-xs leading-relaxed">
              End-of-life e-waste is handled only through authorised channels under the E-Waste
              (Management) Rules, 2022.
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="related-heading">
          <SectionHeading
            title={<span id="related-heading">More in {categoryLabel(listing.category)}</span>}
          />
          <ListingGrid listings={related} />
        </section>
      )}
    </Container>
  );
}

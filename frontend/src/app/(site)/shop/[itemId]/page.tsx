import { ArrowLeft, Check, Info, MapPin, ShieldCheck, Truck, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import { ItemVisual } from "@/features/inventory/components/ItemVisual";
import { GRADE_INFO, categoryLabel } from "@/features/inventory/model";
import { ReserveItem } from "@/features/sell/components/ReserveItem";
import { ItemGrid } from "@/features/shop/components/ItemGrid";
import { getAllShopIds, getRelatedShopItems, getShopItem } from "@/features/shop/queries";
import { BUSINESS_RULES } from "@/config/business-rules";
import { env } from "@/lib/env";
import { formatPrice } from "@/lib/utils/money";

export async function generateStaticParams() {
  return (await getAllShopIds()).map((itemId) => ({ itemId }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[itemId]">): Promise<Metadata> {
  const item = await getShopItem((await params).itemId);
  if (!item) return { title: "Item not found" };
  return {
    title: `${item.title} (Grade ${item.grade})`,
    description: `${GRADE_INFO[item.grade].label} · ${formatPrice(item.pricePaise)} · ${item.id}. ${item.description}`,
    alternates: { canonical: `/shop/${item.id}` },
  };
}

export default async function ShopItemPage({ params }: PageProps<"/shop/[itemId]">) {
  const item = await getShopItem((await params).itemId);
  if (!item) notFound();
  const related = await getRelatedShopItems(item);
  const grade = GRADE_INFO[item.grade];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.title,
    sku: item.id,
    description: item.description,
    category: categoryLabel(item.category),
    url: `${env.NEXT_PUBLIC_SITE_URL}/shop/${item.id}`,
    offers: {
      "@type": "Offer",
      price: (item.pricePaise / 100).toFixed(2),
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      itemCondition:
        item.grade === "C"
          ? "https://schema.org/UsedCondition"
          : "https://schema.org/RefurbishedCondition",
    },
  };

  return (
    <Container className="py-8 sm:py-12">
      <script
        type="application/ld+json"
        // "<" is escaped so item text can never close this script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <li>
            <Link href="/shop" className="inline-flex items-center gap-1 hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/shop?category=${item.category}`} className="hover:text-ink">
              {categoryLabel(item.category, true)}
            </Link>
          </li>
          <li aria-hidden="true" className="hidden sm:block">
            /
          </li>
          <li aria-current="page" className="hidden font-mono text-ink sm:block">
            {item.id}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <ItemVisual
          category={item.category}
          partType={item.partType}
          grade={item.grade}
          photo={item.photo}
          alt={item.title}
          size="hero"
          className="aspect-[16/11] rounded-panel border border-line lg:sticky lg:top-28 lg:aspect-[4/3.4]"
        />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <GradeBadge grade={item.grade} />
            <span className="font-mono text-sm text-muted">{item.id}</span>
            {item.sample && (
              <span className="rounded bg-sunken px-2 py-0.5 text-xs font-medium text-muted">
                Sample item
              </span>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{item.title}</h1>
          <p className="mt-2 text-sm text-muted">{categoryLabel(item.category)}</p>
          <div className="mt-6 flex flex-wrap items-baseline gap-x-3">
            <p className="font-display text-4xl font-bold">{formatPrice(item.pricePaise)}</p>
            {item.wasPaise && (
              <p className="text-muted">
                <s>
                  <span className="sr-only">was </span>
                  {formatPrice(item.wasPaise)}
                </s>{" "}
                <span className="font-medium text-grade-a">Price reduced</span>
              </p>
            )}
          </div>

          <ul className="mt-6 space-y-2.5 text-sm text-ink-soft">
            {item.warrantyDays && (
              <li className="flex gap-2.5">
                <ShieldCheck className="size-5 shrink-0 text-grade-a" aria-hidden="true" />
                <span>
                  <strong className="text-ink">{item.warrantyDays}-day warranty</strong> on this
                  device.{" "}
                  <Link href="/warranty" className="text-brand-600 underline">
                    What it covers
                  </Link>
                </span>
              </li>
            )}
            <li className="flex gap-2.5">
              <MapPin className="size-5 shrink-0 text-brand-600" aria-hidden="true" />
              <span>
                <strong className="text-ink">Free pickup</strong> from our hub in Jammu
              </span>
            </li>
            <li className="flex gap-2.5">
              <Truck className="size-5 shrink-0 text-brand-600" aria-hidden="true" />
              <span>
                <strong className="text-ink">
                  {formatPrice(BUSINESS_RULES.jammuDeliveryPaise)} delivery
                </strong>{" "}
                anywhere in Jammu
                {item.shipsIndia && <> · ships across India at the buyer&apos;s cost</>}
              </span>
            </li>
          </ul>

          <ReserveItem
            itemId={item.id}
            title={item.title}
            pricePaise={item.pricePaise}
            shipsIndia={item.shipsIndia}
            sample={item.sample}
          />

          <h2 className="mt-10 font-sans text-sm font-semibold tracking-normal text-muted uppercase">
            What grade {item.grade} means
          </h2>
          <p className="mt-2 leading-relaxed text-ink-soft">{grade.description}</p>

          {item.description && (
            <>
              <h2 className="mt-8 font-sans text-sm font-semibold tracking-normal text-muted uppercase">
                About this item
              </h2>
              <p className="mt-2 leading-relaxed text-ink-soft">{item.description}</p>
            </>
          )}

          {(item.checks.length > 0 || item.dataWiped) && (
            <>
              <h2 className="mt-8 font-sans text-sm font-semibold tracking-normal text-muted uppercase">
                Tested at the hub
              </h2>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {item.checks.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-sm text-ink-soft">
                    <Check className="size-4 text-grade-a" aria-hidden="true" />
                    {c}
                  </li>
                ))}
                {item.dataWiped && (
                  <li className="flex items-center gap-2 text-sm font-medium text-ink">
                    <Check className="size-4 text-grade-a" aria-hidden="true" />
                    Data wiped
                  </li>
                )}
              </ul>
            </>
          )}

          {item.grade === "C" && (
            <p className="mt-8 flex gap-2 rounded-xl bg-sunken p-4 text-sm leading-relaxed text-ink-soft">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Parts are tested before sale. Check compatibility with your device before buying.
            </p>
          )}
          <p className="mt-6 flex gap-2 text-xs leading-relaxed text-muted">
            <Package className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Item {item.id} is held at the ReLoop hub. Reserve it and we&apos;ll confirm availability
            before you pay.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-heading">
          <SectionHeading
            id="related-heading"
            title={`More ${categoryLabel(item.category, true).toLowerCase()}`}
          />
          <ItemGrid items={related} />
        </section>
      )}
    </Container>
  );
}

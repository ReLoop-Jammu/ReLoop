import {
  ArrowRight,
  Building2,
  Recycle,
  ShieldCheck,
  Store,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CtaBanner } from "@/components/marketing/CtaBanner";
import { GradeStrip } from "@/components/marketing/GradeStrip";
import { HeroShowcase } from "@/components/marketing/HeroShowcase";
import { TrustStrip } from "@/components/marketing/TrustStrip";
import { LoopSteps } from "@/components/marketing/LoopSteps";
import { BUSINESS_RULES } from "@/config/business-rules";
import { ImpactCounter } from "@/features/impact/ImpactCounter";
import { getImpactTotals } from "@/features/impact/queries";
import { NetworkPreview } from "@/features/network/NetworkPreview";
import { ItemGrid } from "@/features/shop/components/ItemGrid";
import { getSiteSettings } from "@/features/settings/server";
import { getLatestShopItems, isSampleStock } from "@/features/shop/queries";
import { env } from "@/lib/env";
import { SITE } from "@/lib/site";
import { formatPrice } from "@/lib/utils/money";

const PROMISES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "Tested and graded",
    body: "Every device carries an RL-JMU tag and grade A or B; every part is a tested part.",
  },
  {
    icon: Wrench,
    title: `${BUSINESS_RULES.warrantyDays}-day warranty`,
    body: "On grade A and B devices.",
  },
  {
    icon: Truck,
    title: "Pickup or delivery",
    body: `Free from the hub, or ${formatPrice(BUSINESS_RULES.jammuDeliveryPaise)} in Jammu city.`,
  },
  {
    icon: Recycle,
    title: "Nothing dumped",
    body: "What can't be reused goes to VRRG Group, our dismantling partner, by weight.",
  },
];

const SELL_PATHS: { href: string; icon: LucideIcon; title: string; body: string }[] = [
  {
    href: "/sell/shops",
    icon: Store,
    title: "Repair shops, retailers & exchange stores",
    body: "Scrap weighed and paid by UPI on the spot, on a fixed weekly pickup day.",
  },
  {
    href: "/sell/institutions",
    icon: Building2,
    title: "Colleges, schools, banks & offices",
    body: "Booked lot pickups, sorted on site, with a handover record.",
  },
];

export default async function HomePage() {
  const [latest, sample, impact, site] = await Promise.all([
    getLatestShopItems(8),
    isSampleStock(),
    getImpactTotals(),
    getSiteSettings(),
  ]);

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.legalName ?? SITE.name,
    url: env.NEXT_PUBLIC_SITE_URL,
    logo: `${env.NEXT_PUBLIC_SITE_URL}/icon.svg`,
    description: SITE.description,
    areaServed: "Jammu, India",
    ...(site.supportEmail && { email: site.supportEmail }),
    ...(site.supportPhone && { telephone: site.supportPhone }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)] opacity-70"
        />
        <Container className="relative grid items-center gap-12 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pt-20 lg:pb-24">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm text-ink-soft shadow-soft">
              <span className="rounded-full bg-grade-a-bg px-2 py-0.5 text-xs font-semibold text-grade-a">
                New
              </span>
              Jammu pilot · weekly pickups from partner shops
            </span>
            <h1 className="mt-6 text-[2.6rem] leading-[1.02] font-bold sm:text-6xl lg:text-[4.25rem]">
              Collect. Grade.
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
                Resell what still works.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              ReLoop buys used and broken electronics from Jammu&apos;s repair shops, retailers and
              institutions, tests and grades them at one hub, and resells what still works as graded
              devices and tested parts. Scrap is weighed and handed to VRRG Group, our dismantling
              partner.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/shop" size="lg">
                Shop graded electronics
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/sell" size="lg" variant="secondary">
                For shops &amp; institutions
              </ButtonLink>
            </div>
          </div>
          <HeroShowcase items={latest.slice(0, 3)} />
        </Container>
      </section>

      <TrustStrip />

      {/* Promises */}
      <section aria-label="Why buy from ReLoop" className="border-y border-line bg-surface">
        <Container>
          <ul className="grid gap-x-6 gap-y-5 py-8 sm:grid-cols-2 lg:grid-cols-4" role="list">
            {PROMISES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-0.5 text-sm text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <ImpactCounter totals={impact} />

      <section className="py-16 sm:py-20" aria-labelledby="network-heading">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>The Jammu loop</Eyebrow>
            <h2 id="network-heading" className="mt-3 text-3xl font-bold sm:text-4xl">
              From the market to the hub, and to VRRG Group
            </h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Partner shops on our Tuesday and Friday routes sell their scrap by weight. The hub
              tests what can be reused; whatever is dead goes to VRRG Group on a weight receipt.
            </p>
            <ButtonLink href="/network" variant="secondary" className="mt-6">
              See the network
            </ButtonLink>
          </div>
          <NetworkPreview />
        </Container>
      </section>

      {/* Grades */}
      <section className="py-16 sm:py-20" aria-labelledby="grades-heading">
        <Container>
          <SectionHeading
            id="grades-heading"
            eyebrow={<Eyebrow>Four grades</Eyebrow>}
            title="Every device gets an honest grade"
            description="We test everything at our hub before it goes anywhere. The grade decides a device's next life; a working part is a tested part."
          />
          <GradeStrip />
        </Container>
      </section>

      {/* Stock */}
      <section className="pb-16 sm:pb-20" aria-labelledby="stock-heading">
        <Container>
          <SectionHeading
            id="stock-heading"
            eyebrow={<Eyebrow>{sample ? "Preview" : "Fresh from the hub"}</Eyebrow>}
            title={sample ? "How our stock will look" : "Latest graded stock"}
            description={
              sample
                ? "Sample items for now. Real stock appears here as the hub tests it."
                : "Tagged, tested and ready for pickup or delivery in Jammu."
            }
            actions={
              <ButtonLink href="/shop" variant="secondary">
                Open the shop
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            }
          />
          <ItemGrid items={latest} />
        </Container>
      </section>

      {/* The loop */}
      <section
        className="relative overflow-hidden bg-brand-950 py-20 sm:py-24"
        aria-labelledby="loop-heading"
      >
        <div className="absolute inset-0 bg-dots opacity-40" aria-hidden="true" />
        <Container className="relative">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Eyebrow tone="dark">The loop</Eyebrow>
            <h2 id="loop-heading" className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              From the bazaar to its next owner
            </h2>
          </div>
          <LoopSteps tone="dark" />
          <div className="mt-12 text-center">
            <ButtonLink href="/how-it-works" variant="gold">
              See how the hub works
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Sell paths */}
      <section className="py-16 sm:py-20" aria-labelledby="sell-heading">
        <Container>
          <SectionHeading
            id="sell-heading"
            eyebrow={<Eyebrow>For shops &amp; institutions</Eyebrow>}
            title="Run a repair shop, store or office?"
            description="Scrap is paid by the kilo at the rate card. Working devices get an offer after testing. Working parts are priced one by one, or listed by you on the Parts Exchange."
            actions={
              <ButtonLink href="/rate-card" variant="secondary">
                The rate card
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            }
          />
          <ul className="grid gap-4 md:grid-cols-2" role="list">
            {SELL_PATHS.map(({ href, icon: Icon, title, body }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full items-start gap-4 rounded-card border border-line bg-surface p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="flex items-center gap-1 font-semibold text-ink">
                      {title}
                      <ArrowRight
                        className="size-4 opacity-0 transition group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-1 block text-sm text-muted">{body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Scrap CTA */}
      <section className="pb-20">
        <Container>
          <CtaBanner
            eyebrow="Where scrap goes"
            title="Nothing dead goes in the bin."
            description="Dead scrap and every battery go to VRRG Group, Gangyal, by weight, with a weight receipt for each handover."
            actions={
              <ButtonLink href="/where-scrap-goes" size="lg" variant="dark">
                Where scrap goes
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            }
          />
        </Container>
      </section>
    </>
  );
}

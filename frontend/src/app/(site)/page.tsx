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
import { ActivityFeed } from "@/features/transparency/ActivityFeed";
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
      <section className="px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="relative overflow-hidden rounded-[2rem] bg-mesh text-white sm:rounded-[2.5rem]">
          <div className="absolute inset-0 bg-dots opacity-40" aria-hidden="true" />
          <div
            aria-hidden="true"
            className="absolute -right-32 -bottom-40 size-[34rem] rounded-full bg-gold-400/20 blur-3xl"
          />
          <Container className="relative grid items-center gap-12 pt-14 pb-16 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pt-24 lg:pb-28">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-sm text-white/85 ring-1 ring-white/15 backdrop-blur ring-inset">
                <span className="rounded-full bg-gold-400 px-2 py-0.5 text-xs font-bold text-brand-950">
                  New
                </span>
                Jammu pilot · weekly pickups from partner shops
              </span>
              <h1 className="mt-7 text-[2.8rem] leading-[0.98] font-bold text-white sm:text-7xl lg:text-[5.25rem]">
                Collect. Grade.
                <br />
                <span className="text-gold-400">Resell what still works.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
                ReLoop buys used and broken electronics from Jammu&apos;s repair shops, retailers
                and institutions, tests and grades them at one hub, and resells what still works as
                graded devices and tested parts. Scrap is weighed and handed to VRRG Group, our
                dismantling partner.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/shop" size="lg" variant="gold">
                  Shop graded electronics
                  <ArrowRight className="size-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink
                  href="/sell"
                  size="lg"
                  className="bg-white/10 bg-none text-white shadow-none ring-white/25 hover:bg-white/15"
                >
                  For shops &amp; institutions
                </ButtonLink>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-6">
                {[
                  ["A–D", "honest grade on every device"],
                  [`${BUSINESS_RULES.warrantyDays} days`, "warranty on A and B"],
                  ["100%", "of scrap to VRRG Group, by weight"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="sr-only">{label}</dt>
                    <dd className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {value}
                    </dd>
                    <dd className="mt-1 text-xs leading-snug text-white/60 sm:text-sm">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <HeroShowcase items={latest.slice(0, 3)} />
          </Container>
        </div>
      </section>

      <TrustStrip />

      {/* Promises */}
      <section aria-label="Why buy from ReLoop" className="py-6">
        <Container>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="list">
            {PROMISES.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="group rounded-card border border-line bg-surface p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-brand-100 transition ring-inset group-hover:scale-105">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-5 text-base font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <ImpactCounter totals={impact} />

      <ActivityFeed />

      <section className="py-16 sm:py-20" aria-labelledby="network-heading">
        <Container>
          <div className="grid items-center gap-10 overflow-hidden rounded-panel border border-line bg-surface p-6 shadow-soft sm:p-10 lg:grid-cols-2 lg:p-14">
            <div>
              <Eyebrow>The Jammu loop</Eyebrow>
              <h2
                id="network-heading"
                className="mt-4 text-3xl leading-[1.05] font-bold sm:text-5xl"
              >
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
          </div>
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
      <section className="px-3 sm:px-4" aria-labelledby="loop-heading">
        <div className="relative overflow-hidden rounded-[2rem] bg-mesh py-20 sm:rounded-[2.5rem] sm:py-28">
          <div className="absolute inset-0 bg-dots opacity-40" aria-hidden="true" />
          <Container className="relative">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <Eyebrow tone="dark">The loop</Eyebrow>
              <h2
                id="loop-heading"
                className="mt-4 text-3xl leading-[1.05] font-bold text-white sm:text-5xl"
              >
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
        </div>
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
                  className="group flex h-full items-start gap-5 rounded-card border border-line bg-surface p-7 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
                >
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-mesh text-gold-400 shadow-glow">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="flex items-center gap-1 text-lg font-semibold text-ink">
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

import { ArrowRight, BadgeCheck, Recycle, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CtaBanner } from "@/components/marketing/CtaBanner";
import { HeroShowcase } from "@/components/marketing/HeroShowcase";
import { HowSteps } from "@/components/marketing/HowSteps";
import { CategoryTiles } from "@/features/listings/components/CategoryTiles";
import { ListingGrid } from "@/features/listings/components/ListingGrid";
import {
  getCategoryCounts,
  getFeaturedListings,
  getPublishedListings,
} from "@/features/listings/queries";

const PROMISES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ShieldCheck, title: "Condition-checked", body: "Every item is graded before it's sold." },
  { icon: BadgeCheck, title: "Verified partners", body: "Businesses and collectors are vetted." },
  { icon: Truck, title: "Across India", body: "Collected in Jammu, delivered nationwide." },
  { icon: Recycle, title: "Responsible end-of-life", body: "Only authorised recycling channels." },
];

const IMPACT_STATS = [
  { value: "1.94M", unit: "tonnes", label: "E-waste estimated in India, FY 2024–25" },
  { value: "5", unit: "routes", label: "Reuse categories, from devices to bulk lots" },
  { value: "1", unit: "hub", label: "Collection starting in Jammu, J&K" },
];

export default async function HomePage() {
  const [featured, { total }, counts] = await Promise.all([
    getFeaturedListings(8),
    getPublishedListings(),
    getCategoryCounts(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)] opacity-70"
        />
        <Container className="relative grid items-center gap-12 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pt-20 lg:pb-24">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm text-ink-soft shadow-soft">
              <span className="rounded-full bg-condition-working-bg px-2 py-0.5 text-xs font-semibold text-condition-working">
                New
              </span>
              Now collecting in Jammu, J&amp;K
            </span>
            <h1 className="mt-6 text-[2.75rem] leading-[1.02] font-bold sm:text-6xl lg:text-7xl">
              Old tech.
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
                New possibilities.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Buy, sell and recover value from used electronics, repairable devices and reusable
              components — checked by ReLoop, connected to buyers across India.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/listings" size="lg">
                Explore the marketplace
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/sell" size="lg" variant="secondary">
                Sell your electronics
              </ButtonLink>
            </div>
          </div>
          <HeroShowcase listings={featured.slice(0, 3)} total={total} />
        </Container>
      </section>

      {/* Promises */}
      <section aria-label="Why ReLoop" className="border-y border-line bg-surface">
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

      {/* Categories */}
      <section className="py-16 sm:py-20" aria-labelledby="categories-heading">
        <Container>
          <SectionHeading
            id="categories-heading"
            eyebrow={<Eyebrow>Browse</Eyebrow>}
            title="Shop by category"
            description="From single devices to institutional lots — find the right next life for every item."
          />
          <CategoryTiles counts={counts} />
        </Container>
      </section>

      {/* Featured listings */}
      <section className="pb-16 sm:pb-20" aria-labelledby="featured-heading">
        <Container>
          <SectionHeading
            id="featured-heading"
            eyebrow={<Eyebrow>Fresh in</Eyebrow>}
            title="Latest listings"
            description="Checked and listed by ReLoop in Jammu."
            actions={
              <ButtonLink href="/listings" variant="secondary">
                View all {total}
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            }
          />
          <ListingGrid listings={featured} />
        </Container>
      </section>

      {/* How it works */}
      <section
        className="relative overflow-hidden bg-brand-950 py-20 sm:py-24"
        aria-labelledby="how-heading"
      >
        <div className="absolute inset-0 bg-dots opacity-40" aria-hidden="true" />
        <Container className="relative">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Eyebrow tone="dark">How it works</Eyebrow>
            <h2 id="how-heading" className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              From drawer to second life in three steps
            </h2>
          </div>
          <HowSteps tone="dark" />
          <div className="mt-12 text-center">
            <ButtonLink href="/how-it-works" variant="gold">
              Learn how ReLoop works
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Impact */}
      <section className="py-16 sm:py-20" aria-labelledby="impact-heading">
        <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow>Why it matters</Eyebrow>
            <h2 id="impact-heading" className="mt-3 text-3xl font-bold sm:text-4xl">
              Every device deserves a second chance.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Much of what India throws away still works, can be repaired, or holds recoverable
              materials. ReLoop starts in Jammu to route more of it to reuse.
            </p>
            <ButtonLink href="/impact" variant="ghost" className="mt-5 -ml-5">
              Read about our impact
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            {IMPACT_STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-card border border-line bg-surface p-6 shadow-soft"
              >
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="font-display text-4xl font-bold text-brand-600">{s.value}</span>
                  <span className="ml-1.5 text-sm font-medium text-muted">{s.unit}</span>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.label}</p>
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Seller CTA */}
      <section className="pb-20">
        <Container>
          <CtaBanner
            eyebrow="For sellers"
            title="Have unused electronics in Jammu?"
            description="Individuals get every listing reviewed by ReLoop. Verified businesses and collectors publish instantly."
            actions={
              <>
                <ButtonLink href="/sell" size="lg" variant="dark">
                  Start selling
                  <ArrowRight className="size-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink
                  href="/how-it-works"
                  size="lg"
                  variant="secondary"
                  className="border-brand-950/20 bg-white/60"
                >
                  How it works
                </ButtonLink>
              </>
            }
          />
        </Container>
      </section>
    </>
  );
}

import { LogoMark } from "@/components/brand/Logo";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CtaBanner } from "@/components/marketing/CtaBanner";
import { HowSteps } from "@/components/marketing/HowSteps";
import { CategoryTiles } from "@/features/listings/components/CategoryTiles";
import { ListingGrid } from "@/features/listings/components/ListingGrid";
import { CATEGORIES } from "@/features/listings/model";
import { getFeaturedListings, getPublishedListings } from "@/features/listings/queries";
import Link from "next/link";

export default async function HomePage() {
  const [featured, { total }] = await Promise.all([getFeaturedListings(8), getPublishedListings()]);

  return (
    <>
      <section className="py-12 sm:py-20">
        <Container className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-fade-up">
            <Eyebrow>♻ Circular electronics marketplace</Eyebrow>
            <h1 className="mt-5 text-5xl leading-[0.95] font-black tracking-tighter sm:text-7xl">
              Old tech.
              <br />
              <span className="text-primary">New possibilities.</span>
            </h1>
            <p className="text-muted mt-6 max-w-xl text-lg leading-relaxed">
              Buy, sell and recover value from used electronics, repairable devices and reusable
              components. Collected in Jammu. Connected to buyers across India.
            </p>
            <div className="mt-8 grid gap-3 sm:flex">
              <ButtonLink href="/listings" size="lg">
                Explore marketplace →
              </ButtonLink>
              <ButtonLink href="/sell" size="lg" variant="secondary">
                Submit inventory to ReLoop
              </ButtonLink>
            </div>
          </div>
          <div className="relative grid min-h-72 place-items-center sm:min-h-96" aria-hidden="true">
            <div className="border-primary/20 grid size-56 place-items-center rounded-full border bg-[radial-gradient(circle,rgb(30_107_158/0.12),transparent_70%)] sm:size-72">
              <LogoMark id="hero" className="size-32 drop-shadow-md sm:size-36" />
            </div>
            <span className="animate-float border-line bg-surface text-primary-strong shadow-card absolute top-6 left-0 rounded-full border px-4 py-2 text-sm font-bold sm:left-4">
              🔌 Reuse before recycling
            </span>
            <span className="animate-float border-line bg-surface text-primary-strong shadow-card absolute right-0 bottom-8 rounded-full border px-4 py-2 text-sm font-bold [animation-delay:1.2s] sm:right-4">
              📦 From Jammu to India
            </span>
          </div>
        </Container>
      </section>

      <section className="py-10" aria-labelledby="categories-heading">
        <Container>
          <SectionHeading
            title={<span id="categories-heading">Explore by category</span>}
            description="Find a second life for electronics and components."
          />
          <CategoryTiles />
        </Container>
      </section>

      <section className="py-10" aria-labelledby="featured-heading">
        <Container>
          <SectionHeading
            title={<span id="featured-heading">Marketplace listings</span>}
            description="Electronics and components managed and verified by ReLoop."
            actions={
              <ButtonLink href="/listings" variant="secondary">
                View all {total} listings ↗
              </ButtonLink>
            }
          />
          <ListingGrid listings={featured} />
        </Container>
      </section>

      <section className="py-10" aria-labelledby="impact-band-heading">
        <Container>
          <div className="rounded-panel border-line bg-surface grid gap-6 border p-7 sm:grid-cols-2 sm:p-10 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Eyebrow>♻ Circular impact</Eyebrow>
              <h2 id="impact-band-heading" className="mt-3 text-2xl font-black">
                Every device deserves a second chance.
              </h2>
            </div>
            {[
              { icon: "🔁", value: String(total), label: "Listings to explore" },
              { icon: "🧩", value: String(CATEGORIES.length), label: "Reuse categories" },
              { icon: "📍", value: "Jammu", label: "Local collection hub" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl" aria-hidden="true">
                  {stat.icon}
                </div>
                <strong className="text-primary mt-1 block text-3xl font-black">
                  {stat.value}
                </strong>
                <small className="text-muted">{stat.label}</small>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-10" aria-labelledby="how-heading">
        <Container>
          <SectionHeading
            title={<span id="how-heading">How ReLoop works</span>}
            description="A simple path from unwanted electronics to their next useful life."
            actions={
              <Link href="/how-it-works" className="text-primary font-bold hover:underline">
                Learn more →
              </Link>
            }
          />
          <HowSteps />
        </Container>
      </section>

      <section className="py-10 pb-20">
        <Container>
          <CtaBanner
            title="Have unused electronics in Jammu?"
            description="Submit your electronics for ReLoop review and inventory assessment."
            action={
              <Link
                href="/sell"
                className={buttonClasses({
                  size: "lg",
                  className: "bg-accent text-primary-strong hover:bg-accent",
                })}
              >
                Submit inventory →
              </Link>
            }
          />
        </Container>
      </section>
    </>
  );
}

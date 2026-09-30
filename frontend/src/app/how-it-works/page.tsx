import {
  ArrowRight,
  Building2,
  ChevronDown,
  ShoppingBag,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HowSteps } from "@/components/marketing/HowSteps";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How buying and selling used electronics through ReLoop works, for buyers, individual sellers and verified partners.",
};

const AUDIENCES: { icon: LucideIcon; title: string; tag: string; points: string[] }[] = [
  {
    icon: ShoppingBag,
    title: "Buyers",
    tag: "No account needed to browse",
    points: [
      "Browse and search every listing for free.",
      "Send an inquiry; ReLoop confirms condition and availability.",
      "Payment and delivery are arranged with ReLoop before anything changes hands.",
    ],
  },
  {
    icon: UserRound,
    title: "Individual sellers",
    tag: "Reviewed before going live",
    points: [
      "List your own used devices and components.",
      "Every listing is checked by ReLoop to keep quality high.",
      "You'll be told if anything in your listing needs fixing.",
    ],
  },
  {
    icon: Building2,
    title: "Verified partners",
    tag: "Publish instantly",
    points: [
      "Businesses, colleges, collectors and recyclers can apply for verification.",
      "Once verified, your listings go live immediately.",
      "Built for bulk lots and regular inventory.",
    ],
  },
];

const FAQS = [
  {
    q: "Does ReLoop take payments online?",
    a: "Not yet. Buyers send inquiries and ReLoop arranges payment and delivery directly. Online payments are planned for a later release.",
  },
  {
    q: "What happens to items that can't be reused?",
    a: "End-of-life material is routed only to authorised recyclers, in line with the E-Waste (Management) Rules, 2022.",
  },
  {
    q: "Where does ReLoop operate?",
    a: "Collection starts in Jammu, J&K. Buyers can be anywhere in India.",
  },
  {
    q: "What about my data on old devices?",
    a: "Please wipe devices before handing them over. ReLoop checks data-wipe status as part of every assessment.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 sm:py-20">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
              A managed route to a second life
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              ReLoop sits between sellers and buyers to check condition, keep listings honest, and
              make sure nothing reusable ends up as waste.
            </p>
          </div>
          <HowSteps />
        </Container>
      </section>

      <Container className="py-16 sm:py-20">
        <section aria-labelledby="who-heading">
          <SectionHeading
            id="who-heading"
            eyebrow={<Eyebrow>Who it&apos;s for</Eyebrow>}
            title="Built for everyone in the loop"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {AUDIENCES.map(({ icon: Icon, title, tag, points }) => (
              <div
                key={title}
                className="rounded-card border border-line bg-surface p-6 shadow-soft"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-1 text-sm font-medium text-gold-700">{tag}</p>
                <ul className="mt-4 space-y-2.5">
                  {points.map((p) => (
                    <li key={p} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500"
                        aria-hidden="true"
                      />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section
          className="mt-20 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]"
          aria-labelledby="faq-heading"
        >
          <div>
            <Eyebrow>Questions</Eyebrow>
            <h2 id="faq-heading" className="mt-3 text-3xl font-bold sm:text-4xl">
              Common questions
            </h2>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/listings">
                Browse listings
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/sell" variant="secondary">
                Sell with ReLoop
              </ButtonLink>
            </div>
          </div>
          <div className="divide-y divide-line rounded-card border border-line bg-surface shadow-soft">
            {FAQS.map((f) => (
              <details key={f.q} className="group p-5 sm:p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown
                    className="size-5 shrink-0 text-muted transition group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </Container>
    </>
  );
}

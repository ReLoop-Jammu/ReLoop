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

const AUDIENCES = [
  {
    icon: "🛒",
    title: "Buyers",
    points: [
      "Browse and search listings for free — no account needed.",
      "Send an inquiry on any item; ReLoop confirms condition and availability.",
      "Payment and delivery are arranged with ReLoop before anything changes hands.",
    ],
  },
  {
    icon: "🙋",
    title: "Individual sellers",
    points: [
      "List your own used devices and components.",
      "Every listing is reviewed by ReLoop before it goes live, to keep quality high.",
      "You’ll be told if anything needs fixing in your listing.",
    ],
  },
  {
    icon: "🏢",
    title: "Verified partners",
    points: [
      "Businesses, colleges, collectors and recyclers can apply for verification.",
      "Once verified, your listings publish immediately.",
      "Ideal for bulk lots and regular inventory.",
    ],
  },
];

const FAQS = [
  {
    q: "Does ReLoop take payments online?",
    a: "Not yet. For now, buyers send inquiries and ReLoop arranges payment and delivery directly. Online payments are planned for a later release.",
  },
  {
    q: "What happens to items that can’t be reused?",
    a: "End-of-life material is routed only to authorised recyclers, in line with the E-Waste (Management) Rules, 2022.",
  },
  {
    q: "Where does ReLoop operate?",
    a: "Collection starts in Jammu, J&K. Buyers can be anywhere in India.",
  },
  {
    q: "What about my data on old devices?",
    a: "Sellers should wipe devices before handing them over. ReLoop checks data-wipe status as part of assessment.",
  },
];

export default function HowItWorksPage() {
  return (
    <Container className="py-10 sm:py-16">
      <SectionHeading
        as="h1"
        eyebrow={<Eyebrow>How it works</Eyebrow>}
        title="A managed route from unwanted electronics to their next life"
        description="ReLoop sits between sellers and buyers to check condition, keep listings honest, and make sure nothing reusable ends up as waste."
      />
      <HowSteps />

      <section className="mt-16" aria-labelledby="who-heading">
        <SectionHeading title={<span id="who-heading">Who ReLoop is for</span>} />
        <div className="grid gap-4 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="rounded-card border-line bg-surface border p-6">
              <div className="text-3xl" aria-hidden="true">
                {a.icon}
              </div>
              <h3 className="mt-3 text-lg font-extrabold">{a.title}</h3>
              <ul className="text-muted mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {a.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="faq-heading">
        <SectionHeading title={<span id="faq-heading">Common questions</span>} />
        <div className="divide-line rounded-card border-line bg-surface divide-y border">
          {FAQS.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="text-primary-strong flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {f.q}
                <span aria-hidden="true" className="text-primary transition group-open:rotate-45">
                  ＋
                </span>
              </summary>
              <p className="text-muted mt-3 text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink href="/listings" size="lg">
          Browse the marketplace →
        </ButtonLink>
        <ButtonLink href="/sell" size="lg" variant="secondary">
          Sell with ReLoop
        </ButtonLink>
      </div>
    </Container>
  );
}

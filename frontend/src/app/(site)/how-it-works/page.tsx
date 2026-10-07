import {
  ArrowRight,
  Camera,
  ChevronDown,
  ClipboardCheck,
  Eraser,
  Layers,
  Send,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GradeStrip } from "@/components/marketing/GradeStrip";
import { LoopSteps } from "@/components/marketing/LoopSteps";
import { BUSINESS_RULES } from "@/config/business-rules";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How ReLoop collects, tags, tests, grades, resells and recycles used electronics at its Jammu hub.",
};

const R = BUSINESS_RULES;

const HUB_STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Tag,
    title: "Tag and log",
    body: "Each item gets an ID like RL-JMU-0142 and a record of where it came from.",
  },
  {
    icon: ClipboardCheck,
    title: "Test and grade",
    body: `Checked against a test list and graded A to D within ${R.gradeWithinHours} hours.`,
  },
  {
    icon: Eraser,
    title: "Wipe data",
    body: "Phones, laptops and drives are reset and overwritten. Drives that fail are drilled.",
  },
  {
    icon: Layers,
    title: "Rack by grade",
    body: "Stored by grade. Batteries are kept apart in a closed metal cabinet.",
  },
  {
    icon: Camera,
    title: "List online",
    body: `Grade A and B items are photographed and listed within ${R.listWithinHours} hours.`,
  },
  {
    icon: Send,
    title: "Hand over",
    body: "Collected from the hub, delivered in Jammu, or handed to the recycler.",
  },
];

const FAQS = [
  {
    q: "What happens if an item doesn't sell?",
    a: `After ${R.priceCut.afterDays} days its price drops by ${Math.round(R.priceCut.share * 100)}%. After ${R.downgradeToC.afterDays} days it is taken apart: good parts are tested and sold, and the rest goes to the recycler.`,
  },
  {
    q: "Is my data safe if I sell you a phone or laptop?",
    a: "Every phone, laptop and drive is wiped before it is listed, and the wipe is recorded against its tag. Drives that fail the wipe are physically destroyed.",
  },
  {
    q: "Who repairs grade-B items?",
    a: "Partner repair shops in Jammu, for a fixed fee per job. The item is re-tested at the hub before it is listed.",
  },
  {
    q: "Do you deliver outside Jammu?",
    a: "Inside Jammu we deliver for ₹50, or you can collect for free from the hub. Laptops and boards can be shipped across India, with shipping paid by the buyer.",
  },
  {
    q: "Are you a registered recycler?",
    a: "No. ReLoop trades in used equipment for reuse. Dead and hazardous items go only to an authorised recycler, with a weight receipt for every handover.",
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
              Collect. Grade. Resell. Recycle.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Every item passes through one hub in Jammu before it leaves. That&apos;s how we know
              what works, what can be fixed, and what has truly reached the end.
            </p>
          </div>
          <LoopSteps />
        </Container>
      </section>

      <Container className="py-16 sm:py-20">
        <section aria-labelledby="hub-heading">
          <SectionHeading
            id="hub-heading"
            eyebrow={<Eyebrow>At the hub</Eyebrow>}
            title="Six steps for every item"
            description="Whether it came from a shop counter, a college lab or a kitchen drawer."
          />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {HUB_STEPS.map(({ icon: Icon, title, body }, i) => (
              <li
                key={title}
                className="flex gap-4 rounded-card border border-line bg-surface p-5 shadow-soft"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-ink">
                    <span className="mr-1.5 text-gold-700">{i + 1}.</span>
                    {title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20" aria-labelledby="grades-heading">
          <SectionHeading
            id="grades-heading"
            eyebrow={<Eyebrow>Grades</Eyebrow>}
            title="What each grade means"
          />
          <GradeStrip />
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
              <ButtonLink href="/shop">
                Shop graded stock
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/sell" variant="secondary">
                Sell to us
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

import {
  BatteryWarning,
  Building2,
  Receipt,
  Scale,
  ShieldCheck,
  Weight,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BUSINESS_RULES } from "@/config/business-rules";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";

export const metadata: Metadata = {
  title: "Where scrap goes",
  description:
    "Dead and hazardous electronics from ReLoop go only to an authorised recycler, weighed, with a receipt for every handover.",
};

const R = BUSINESS_RULES;

const RULES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "Authorised recycler only",
    body: "Grade D items go to a recycler authorised by the J&K Pollution Control Committee. Never to informal scrap dealers.",
  },
  {
    icon: Scale,
    title: "Weighed and bagged",
    body: "Dead items are bagged by category and weighed at the hub. They are never opened beyond simple part removal.",
  },
  {
    icon: Receipt,
    title: "A receipt every time",
    body: "Every handover comes with a weight receipt from the recycler, filed against the items' tags.",
  },
  {
    icon: BatteryWarning,
    title: "Batteries, every week",
    body: "Loose and swollen batteries are stored in a closed metal cabinet with sand and handed over every week, whatever the quantity.",
  },
  {
    icon: Weight,
    title: "Regular collections",
    body: `The recycler collects when the scrap cage reaches ${R.scrapHandover.kgTrigger} kg or every ${R.scrapHandover.daysTrigger} days, whichever comes first.`,
  },
  {
    icon: Building2,
    title: "Institutions named on the receipt",
    body: "Dead e-waste from colleges and offices goes directly to the recycler, with the institution named on the weight receipt.",
  },
];

export default function WhereScrapGoesPage() {
  return (
    <Container className="py-12 sm:py-20">
      <div className="max-w-3xl">
        <Eyebrow>Where scrap goes</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Only what is truly dead gets recycled, and it goes to the right place.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Most of what we collect is resold, repaired or stripped for parts. Items that are dead or
          hazardous are graded <GradeBadge grade="D" size="sm" className="align-middle" /> and
          follow strict rules.
        </p>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
        {RULES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="rounded-card border border-line bg-surface p-6 shadow-soft">
            <span className="grid size-11 place-items-center rounded-2xl bg-grade-d-bg text-grade-d">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ul>

      <section
        className="mt-16 grid gap-6 rounded-panel bg-brand-950 p-7 text-white sm:p-10 lg:grid-cols-[1fr_1fr]"
        aria-labelledby="status-heading"
      >
        <div>
          <Eyebrow tone="dark">Being clear</Eyebrow>
          <h2 id="status-heading" className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            What ReLoop is, and isn&apos;t, today
          </h2>
        </div>
        <div className="space-y-3 leading-relaxed text-white/75">
          <p>
            ReLoop trades in used equipment for reuse. We are not a recycler or dismantler
            ourselves, and we don&apos;t claim to be. Recycling is done only by an authorised
            recycler.
          </p>
          <p>
            We plan to apply for our own consent from the J&amp;K Pollution Control Committee and to
            register as a refurbisher on the CPCB portal during our pilot.
          </p>
        </div>
      </section>

      <SectionHeading
        className="mt-16"
        title="Handover totals"
        description="Kilograms handed to the recycler will be published here once collections begin."
      />
    </Container>
  );
}

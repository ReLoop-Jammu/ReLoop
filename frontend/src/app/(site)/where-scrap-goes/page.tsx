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
    "All scrap and every battery from ReLoop goes to VRRG Group, Gangyal, our dismantling partner, by weight, with a weight receipt for every handover.",
};

const R = BUSINESS_RULES;

const RULES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "One partner: VRRG Group, Gangyal",
    body: "Our dismantling partner, a JKPCC-authorised e-waste dismantler. 100% of scrap goes to them on a weight receipt: that is ReLoop's standard. Nothing goes to informal dealers.",
  },
  {
    icon: Scale,
    title: "Weighed and sorted into bins",
    body: "Scrap is weighed in front of the shop, then sorted into four bins at the hub: screens, boards, other, and dead devices. Dead devices have their storage wiped or destroyed first.",
  },
  {
    icon: Receipt,
    title: "A receipt every time",
    body: "Every handover comes with a weight receipt from VRRG Group, filed against our records. The weights are published in the ledger once handovers begin.",
  },
  {
    icon: BatteryWarning,
    title: "Batteries, every week",
    body: "Batteries are stored in a closed metal cabinet with sand and handed over every week, whatever the quantity.",
  },
  {
    icon: Weight,
    title: "Regular handovers",
    body: `A bin is handed over when it reaches ${R.bins.handoverKg} kg or ${R.bins.handoverDays} days pass, whichever comes first.`,
  },
  {
    icon: Building2,
    title: "Institutions named on the receipt",
    body: "Dead e-waste from colleges, schools, banks and offices goes directly to VRRG Group, with the institution named on their weight receipt. ReLoop arranges it but does not carry or store it.",
  },
];

export default function WhereScrapGoesPage() {
  return (
    <Container className="py-12 sm:py-20">
      <div className="max-w-3xl">
        <Eyebrow>Where scrap goes</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Everything dead goes to one named partner, by weight.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Working parts and devices are resold, repaired or stripped for parts. Scrap and devices
          that are dead are graded <GradeBadge grade="D" size="sm" className="align-middle" /> and
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
          <Eyebrow tone="dark">Who does what</Eyebrow>
          <h2 id="status-heading" className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            What ReLoop does, and what VRRG Group does
          </h2>
        </div>
        <div className="space-y-3 leading-relaxed text-white/75">
          <p>
            ReLoop buys, weighs, sorts, tests and resells, and removes working parts for reuse. The
            dismantling of scrap is done by VRRG Group.
          </p>
          <p>
            Working parts are tested and sold as tested parts; only tested-working parts go to labs
            and makers. Anything dead goes only to VRRG Group.
          </p>
        </div>
      </section>

      <SectionHeading
        className="mt-16"
        title="Handover totals"
        description="Kilograms handed to VRRG Group will be published here, from weight receipts, once handovers begin."
      />
    </Container>
  );
}

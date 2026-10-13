import { ArrowRight, Building2, Store, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import { GRADE_INFO, GRADES } from "@/features/inventory/model";
import { formatPrice } from "@/lib/utils/money";
import { BUSINESS_RULES } from "@/config/business-rules";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export const metadata: Metadata = {
  title: "Sell to us",
  description:
    "Sell used and broken electronics to ReLoop in Jammu: repair shops, retailers and institutions. We test, grade and pay.",
};

const PATHS: {
  href: string;
  icon: LucideIcon;
  title: string;
  who: string;
  body: string;
  cta: string;
}[] = [
  {
    href: "/sell/shops",
    icon: Store,
    title: "Repair shops & retailers",
    who: "Raghunath Bazaar, Residency Road, Gandhi Nagar",
    body: "Unclaimed devices, dead units, old spares, trade-ins. Cash on pickup on our Tuesday and Friday route.",
    cta: "Become a partner shop",
  },
  {
    href: "/sell/institutions",
    icon: Building2,
    title: "Colleges, schools & offices",
    who: "Bulk lots of desktops, monitors, printers, UPS",
    body: "We pick up, sort and give you a handover record. Dead e-waste goes straight to an authorised recycler in your name.",
    cta: "Book a pickup",
  },
];

const BUY_RULE: Record<(typeof GRADES)[number], string> = {
  A: `About ${pct(BUSINESS_RULES.buy.A.shareOfResale)} of what we expect to resell it for`,
  B: `About ${pct(BUSINESS_RULES.buy.B.shareOfResale)} of expected resale; we pay for the repair`,
  C: `${formatPrice(BUSINESS_RULES.buy.C.minPaise)}–${formatPrice(BUSINESS_RULES.buy.C.maxPaise)} flat`,
  D: "Nothing to pay, nothing to charge: free, safe disposal",
};

export default function SellPage() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <Eyebrow>Sell to us</Eyebrow>
            <h1 className="mt-4 text-4xl font-bold sm:text-6xl">
              We buy what still has a life in it.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              Working or broken: we inspect each item at our Jammu hub and make an outright purchase
              offer for items we can buy. If you accept, we pay the agreed amount directly. Items we
              cannot purchase are directed to an authorised recycler where appropriate.
            </p>
          </div>
          <ul className="mt-12 grid gap-4 lg:grid-cols-3" role="list">
            {PATHS.map(({ href, icon: Icon, title, who, body, cta }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-panel border border-line bg-canvas p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-7"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-600 text-white">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold">{title}</h2>
                  <p className="mt-1 text-sm font-medium text-gold-700">{who}</p>
                  <p className="mt-3 leading-relaxed text-ink-soft">{body}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 font-semibold text-brand-600">
                    {cta}
                    <ArrowRight
                      className="size-4 transition group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-16 sm:py-20">
        <section aria-labelledby="pay-heading">
          <Eyebrow>How we price</Eyebrow>
          <h2 id="pay-heading" className="mt-3 text-3xl font-bold sm:text-4xl">
            What we pay depends on the grade
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            We test every item and give it a grade. Our price follows simple rules, so if resale
            prices fall, so does our offer, and you always know why.
          </p>
          <div className="mt-8 overflow-hidden rounded-card border border-line bg-surface shadow-soft">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">What ReLoop pays for each grade</caption>
              <thead className="bg-sunken text-xs tracking-wider text-muted uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Grade
                  </th>
                  <th scope="col" className="hidden px-5 py-3 font-semibold sm:table-cell">
                    What it means
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    What we pay
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {GRADES.map((g) => (
                  <tr key={g}>
                    <td className="px-5 py-4 align-top">
                      <GradeBadge grade={g} />
                    </td>
                    <td className="hidden px-5 py-4 align-top text-ink-soft sm:table-cell">
                      {GRADE_INFO[g].description}
                    </td>
                    <td className="px-5 py-4 align-top font-medium text-ink">{BUY_RULE[g]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </>
  );
}

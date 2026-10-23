import { BatteryWarning, Building2, Check, Scale, Store, X, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { BUSINESS_RULES } from "@/config/business-rules";
import { LOCATIONS, ROUTE_DAYS } from "@/config/locations";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import { WhatsAppButton } from "@/features/sell/components/WhatsAppButton";
import { getSiteSettings } from "@/features/settings/server";

export const metadata: Metadata = {
  title: "What we accept",
  description:
    "What shops, retailers and institutions in Jammu can sell to ReLoop, what we don't take, and how batteries and dead items go to VRRG Group by weight.",
};

const R = BUSINESS_RULES;

const who = (): {
  icon: LucideIcon;
  title: string;
  body: string;
  href?: string;
  cta?: string;
}[] => [
  {
    icon: Store,
    title: "Repair shops, retailers and exchange stores",
    body: `We collect from partner shops on our ${ROUTE_DAYS.join(" and ")} routes through the markets, weigh scrap in front of you and pay by UPI on the spot.`,
    href: "/sell/shops",
    cta: "Sell as a shop",
  },
  {
    icon: Building2,
    title: "Colleges, schools, banks and offices",
    body: "Book a lot pickup. We sort on your premises, buy the working and repairable equipment, and arrange for dead e-waste to go straight to VRRG Group on their weight receipt in your institution's name.",
    href: "/sell/institutions",
    cta: "Book an institution pickup",
  },
];

export default async function WhatWeAcceptPage() {
  const site = await getSiteSettings();
  const WE_TAKE = site.acceptTake;
  const WE_DONT_TAKE = site.acceptDont;
  return (
    <Container className="py-12 sm:py-20">
      <div className="max-w-3xl">
        <Eyebrow>What we accept</Eyebrow>
        <h1 className="mt-5 text-4xl leading-[1.02] font-bold sm:text-6xl">
          What shops and institutions can sell us.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Scrap is weighed and paid by the kilo at our scrap prices. Working devices are tagged,
          tested and graded A to D at our Jammu hub: what works is resold, what can be fixed is
          repaired, good parts are tested and reused, and what is dead goes to VRRG Group by weight.{" "}
          <Link className="font-semibold text-brand-600 underline" href="/how-it-works">
            How grading works
          </Link>
          .
        </p>
      </div>

      <section aria-labelledby="take-heading" className="mt-12">
        <h2 id="take-heading" className="text-2xl font-bold">
          What we take
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {WE_TAKE.map((c) => (
            <li
              key={c.title}
              className="flex gap-3 rounded-card border border-line bg-surface p-5 shadow-soft"
            >
              <Check className="mt-0.5 size-5 shrink-0 text-grade-a" aria-hidden="true" />
              <div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-muted">{c.examples}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="dont-heading" className="mt-12">
        <h2 id="dont-heading" className="text-2xl font-bold">
          What we don&apos;t take
        </h2>
        <ul className="mt-5 grid gap-3" role="list">
          {WE_DONT_TAKE.map((t) => (
            <li key={t} className="flex gap-3 text-ink-soft">
              <X className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          We buy from shops, retailers and institutions only, not from homes. Anyone can buy from
          us. Not sure about an item? Ask us on WhatsApp first.{" "}
          <Link className="font-semibold text-brand-600 underline" href="/rate-card">
            See our scrap prices (per kg)
          </Link>
          .
        </p>
      </section>

      <section
        aria-labelledby="dead-heading"
        className="mt-12 grid gap-6 rounded-panel border border-line bg-surface p-7 shadow-soft sm:p-10 lg:grid-cols-2"
      >
        <div>
          <h2 id="dead-heading" className="text-2xl font-bold">
            Batteries and dead items
          </h2>
          <p className="mt-3 leading-relaxed text-muted">
            Scrap does not go to informal dealers. Dead devices are graded{" "}
            <GradeBadge grade="D" size="sm" className="align-middle" /> and, with the scrap, handed
            to {LOCATIONS.recycler.name}, our licensed recycler, by weight.{" "}
            <Link className="font-semibold text-brand-600 underline" href="/where-scrap-goes">
              Where scrap goes
            </Link>
            .
          </p>
        </div>
        <ul className="grid gap-4" role="list">
          <li className="flex gap-3">
            <BatteryWarning className="mt-0.5 size-5 shrink-0 text-grade-d" aria-hidden="true" />
            <span>
              <strong>Batteries</strong> (lithium phone, laptop and tablet cells) are kept apart in
              a closed metal cabinet with sand and handed to VRRG Group every week, whatever the
              quantity. A swollen cell that is not leaking goes in a fire-safe bag to the cabinet; a
              leaking one is refused.
            </span>
          </li>
          <li className="flex gap-3">
            <Scale className="mt-0.5 size-5 shrink-0 text-grade-d" aria-hidden="true" />
            <span>
              <strong>Scrap</strong> is weighed by category into four bins (screens, boards, other
              and dead devices) and handed over when a bin reaches {R.bins.handoverKg} kg or{" "}
              {R.bins.handoverDays} days pass, with a weight receipt for every handover.
            </span>
          </li>
          <li className="flex gap-3">
            <Check className="mt-0.5 size-5 shrink-0 text-grade-a" aria-hidden="true" />
            <span>
              <strong>Data</strong> is wiped, or the storage chip destroyed, before anything is
              stripped or sold, and it is logged against the tag. Boards and drives are covered.
            </span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="who-heading" className="mt-12">
        <h2 id="who-heading" className="text-2xl font-bold">
          Who sells to us
        </h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-2" role="list">
          {who().map(({ icon: Icon, title, body, href, cta }) => (
            <li key={title} className="rounded-card border border-line bg-surface p-6 shadow-soft">
              <Icon className="size-6 text-brand-600" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
              {href && (
                <Link
                  className="mt-3 inline-block text-sm font-semibold text-brand-600 underline"
                  href={href}
                >
                  {cta}
                </Link>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <WhatsAppButton message="Hi ReLoop, I run a shop or represent an institution and would like to sell to ReLoop. Our name is: " />
        </div>
      </section>
    </Container>
  );
}

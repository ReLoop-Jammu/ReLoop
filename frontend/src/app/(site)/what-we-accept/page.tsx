import {
  BatteryWarning,
  Building2,
  Check,
  Home,
  Scale,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { BUSINESS_RULES } from "@/config/business-rules";
import { LOCATIONS } from "@/config/locations";
import { GradeBadge } from "@/features/inventory/components/GradeBadge";
import { WhatsAppButton } from "@/features/sell/components/WhatsAppButton";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "What we accept",
  description:
    "The used and broken electronics ReLoop takes in Jammu, what we don't take, and how batteries and dead items go to the authorised recycler.",
};

const R = BUSINESS_RULES;

/** From the business plan: the categories the hub grades and sells. */
const WE_TAKE: { title: string; examples: string }[] = [
  { title: "Phones and tablets", examples: "Smartphones, feature phones, tablets" },
  { title: "Laptops", examples: "Any brand, including ones that don't switch on" },
  { title: "Desktops", examples: "CPU cabinets, all-in-ones, lab and office PCs" },
  { title: "Monitors", examples: "LCD and LED monitors" },
  { title: "TVs", examples: "LCD, LED and smart TVs" },
  { title: "Printers", examples: "Inkjet and laser printers" },
  { title: "UPS units", examples: "Desktop and office UPS units" },
  { title: "Small appliances", examples: "Mixers, irons, fans and similar" },
  {
    title: "Accessories and parts",
    examples: "Chargers, cables, keyboards, mice, boards, RAM, hard drives, screens",
  },
];

/** Policy choices, not in the business plan; kept short on purpose. */
const WE_DONT_TAKE: string[] = [
  "Large appliances: fridges, washing machines and air conditioners.",
  "Anything that isn't electrical or electronic.",
  "Leaking or swollen batteries, except handed over at the hub, where they go straight into the battery cabinet for the recycler.",
];

const WHO: { icon: LucideIcon; title: string; body: string; href?: string; cta?: string }[] = [
  {
    icon: Store,
    title: "Repair shops and retailers",
    body: `We collect from partner shops on our ${LOCATIONS.route.days.join(" and ")} route through the markets and pay on pickup.`,
    href: "/sell/shops",
    cta: "Sell as a shop",
  },
  {
    icon: Building2,
    title: "Colleges, schools and offices",
    body: "Book a pickup for bulk lots. Dead items go straight to the recycler, with your institution named on the weight receipt.",
    href: "/sell/institutions",
    cta: "Book an institution pickup",
  },
  {
    icon: Home,
    title: "Households",
    body: `Drop-off only, at the hub once it opens in ${SITE.hubOpens}. We don't collect single items from homes.`,
  },
];

export default function WhatWeAcceptPage() {
  return (
    <Container className="py-12 sm:py-20">
      <div className="max-w-3xl">
        <Eyebrow>What we accept</Eyebrow>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Working, broken or dead: if it&apos;s electronics, we can probably take it.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Every item is tagged and graded A to D at our Jammu hub. What works is resold, what can be
          fixed is repaired, good parts are reused, and only what is truly dead goes to the
          authorised recycler.{" "}
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
        <p className="mt-4 text-sm text-muted">Not sure about an item? Ask us on WhatsApp first.</p>
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
            Nothing we take in goes to informal scrap dealers. Dead and hazardous items are graded{" "}
            <GradeBadge grade="D" size="sm" className="align-middle" /> and handed only to{" "}
            {LOCATIONS.recycler.name}, the authorised recycler.{" "}
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
              <strong>Batteries</strong> are kept apart in a closed metal cabinet with sand and
              handed to the recycler every week, whatever the quantity.
            </span>
          </li>
          <li className="flex gap-3">
            <Scale className="mt-0.5 size-5 shrink-0 text-grade-d" aria-hidden="true" />
            <span>
              <strong>Dead items</strong> are bagged by category and weighed, then collected at{" "}
              {R.scrapHandover.kgTrigger} kg or every {R.scrapHandover.daysTrigger} days, with a
              weight receipt for every handover.
            </span>
          </li>
          <li className="flex gap-3">
            <Check className="mt-0.5 size-5 shrink-0 text-grade-a" aria-hidden="true" />
            <span>
              <strong>Your data</strong> is wiped before anything is listed: phones are reset and
              overwritten, and hard drives are wiped, or drilled if the wipe fails.
            </span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="who-heading" className="mt-12">
        <h2 id="who-heading" className="text-2xl font-bold">
          Who can sell to us
        </h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-3" role="list">
          {WHO.map(({ icon: Icon, title, body, href, cta }) => (
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
          <WhatsAppButton message="Hi ReLoop, I'd like to sell old electronics" />
        </div>
      </section>
    </Container>
  );
}

import { ArrowRight, Hammer, Recycle, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BUSINESS_RULES } from "@/config/business-rules";
import { flowsAreThin, impactLinks, summariseImpact } from "@/features/impact/flows";
import { MonthlyBars } from "@/features/impact/MonthlyBars";
import { getImpactFlows } from "@/features/impact/queries";
import { SankeyChart } from "@/features/impact/SankeyChart";
import { formatKg } from "@/features/impact/totals";

export const metadata: Metadata = {
  title: "Our impact",
  description:
    "Jammu's e-waste, kept in Jammu: what ReLoop has weighed, tested, resold and handed to VRRG Group, from weighed records only.",
};

// The flows come from public views and are cached for five minutes.
export const revalidate = 300;

/** An illustrative story, not a real shop or a real figure. */
const STORY = [
  {
    title: "A dead board is left behind",
    body: "A repair shop in a Jammu market replaces a phone's dead board for a customer. The old board stays in the shop with other leftovers.",
  },
  {
    title: "Weighed and paid",
    body: "On the weekly pickup day ReLoop weighs the shop's leftovers in front of the owner and pays by UPI at the rate card. The board goes in the to-test bag.",
  },
  {
    title: "Tested at the hub",
    body: "At the hub the board is tagged, tested and wiped. A part that works is listed on the Parts Exchange; one that does not goes into a scrap bin.",
  },
  {
    title: "Another useful life",
    body: "A technician in Jammu buys the tested part. What is dead is handed to VRRG Group by weight, on a weight receipt.",
  },
];

const ROUTES = [
  {
    icon: Hammer,
    title: "Repair",
    body: "Fix a fault, test the device and return it to useful service where repair is practical.",
  },
  {
    icon: Sparkles,
    title: "Refurbish & reuse",
    body: "Clean, test and accurately describe suitable devices so another buyer can use them for their next chapter.",
  },
  {
    icon: Recycle,
    title: "Handed over by weight",
    body: "When reuse or repair is no longer suitable, scrap and batteries go to VRRG Group, our dismantling partner, on a weight receipt.",
  },
];

const GOALS = [
  "Make used and repairable electronics easier to identify and assess.",
  "Bring condition, quantity, category and location into one managed inventory process.",
  "Help buyers find tested used devices and parts, with an honest grade on every item.",
  "Keep reuse and repair opportunities separate from genuine end-of-life material.",
  "Make sure only what is truly dead reaches VRRG Group, by weight, with a receipt.",
];

const SOURCES = [
  {
    text: "Central Pollution Control Board, E-Waste Management System and E-Waste (Management) Rules, 2022, including the EPR framework and registered-channel requirements.",
    link: "https://www.eprewaste.cpcb.gov.in/",
    linkText: "CPCB E-Waste Portal",
  },
  {
    text: "The repair-shop story is fictional and illustrative. Descriptions of reuse, repair, data security, safe handling and recovery are explanatory information; ReLoop's operating model and impact metrics remain under development.",
  },
];

export default async function ImpactPage() {
  const flows = (await getImpactFlows()) ?? [];
  const thin = flowsAreThin(flows);
  const summary = summariseImpact(flows);
  const numbers = [
    { label: "Scrap weighed", value: `${formatKg(summary.scrapKg)} kg` },
    { label: "Handed to VRRG Group", value: `${formatKg(summary.scrapToVrrgKg)} kg` },
    { label: "Devices on sale or resold", value: formatKg(summary.devices) },
    { label: "Tested parts", value: formatKg(summary.parts) },
  ];
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-40 -left-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,var(--color-gold-100),transparent)]"
        />
        <Container className="relative py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl animate-rise">
            <Eyebrow>Our impact</Eyebrow>
            <h1 className="mt-5 text-5xl leading-[1.02] font-bold sm:text-6xl">
              Jammu&apos;s e-waste, <span className="text-gold-700">kept in Jammu.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">
              Electronics do not become worthless the moment someone stops using them. A phone may
              need a repair, a monitor may still work, and a dead board may hold a part a technician
              can use.{" "}
              <strong className="text-ink">The first question is: what useful life is next?</strong>{" "}
              Everything below is counted from what we weigh and tag at the hub.
            </p>
          </div>
        </Container>
      </section>

      <Container className="pb-20">
        <section aria-labelledby="numbers-heading">
          <h2 id="numbers-heading" className="sr-only">
            The numbers so far
          </h2>
          {thin ? (
            <p
              role="status"
              className="rounded-card border border-line bg-surface p-6 text-ink-soft shadow-soft"
            >
              <strong className="text-ink">The pilot is starting.</strong> The numbers appear here
              as soon as the hub has weighed and tagged its first stock. Nothing on this page is
              estimated or filled in.
            </p>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {numbers.map((n) => (
                <div
                  key={n.label}
                  className="rounded-card border border-line bg-surface p-6 shadow-soft"
                >
                  <dt className="text-xs font-semibold text-muted">{n.label}</dt>
                  <dd className="mt-3 font-display text-3xl font-bold text-brand-600">{n.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-3 text-xs text-muted">
            Kilograms are counted only from weigh-ins and weight receipts. Devices and parts are
            counted by tag.
          </p>
        </section>

        {!thin && (
          <>
            <section className="mt-16" aria-labelledby="flows-heading">
              <SectionHeading
                id="flows-heading"
                eyebrow={<Eyebrow>Where it goes</Eyebrow>}
                title="From a shop's counter to its next use"
                description="Scrap is weighed at the counter and ends at VRRG Group, our dismantling partner. Devices and parts are tested at the hub and sold in Jammu."
              />
              <div className="grid gap-8 rounded-panel border border-line bg-surface p-4 shadow-soft sm:p-8 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">Scrap, by weight</h3>
                  <SankeyChart
                    title="Scrap in kilograms, from source to where it is now"
                    links={impactLinks(flows, "kg")}
                    unit="kg"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Devices and tested parts, by count</h3>
                  <SankeyChart
                    title="Devices and parts in items, from source to outcome"
                    links={impactLinks(flows, "items")}
                    unit="items"
                  />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">
                See the same flows on a map of Jammu on the{" "}
                <Link href="/network" className="font-semibold text-brand-600 underline">
                  network page
                </Link>
                .
              </p>
            </section>

            <section className="mt-16" aria-labelledby="months-heading">
              <SectionHeading
                id="months-heading"
                eyebrow={<Eyebrow>Over time</Eyebrow>}
                title="Month by month"
              />
              <div className="rounded-panel border border-line bg-surface p-6 shadow-soft sm:p-8">
                <MonthlyBars months={summary.months} />
              </div>
            </section>
          </>
        )}

        <section className="mt-16" aria-labelledby="targets-heading">
          <SectionHeading
            id="targets-heading"
            eyebrow={<Eyebrow>Our standards and pilot targets</Eyebrow>}
            title="What we hold ourselves to"
            description="These are targets and standards, not results."
          />
          <ul className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Every kilo by weight receipt",
                body: "All scrap we collect goes to VRRG Group on a weight receipt. We track the share that does, and it should be 100%.",
              },
              {
                title: `${BUSINESS_RULES.targets.kgPerMonth} kg a month`,
                body: "The pilot target for scrap weighed at the counter each month once the partner network is running.",
              },
              {
                title: `${BUSINESS_RULES.targets.partnerShops} partner shops`,
                body: "The pilot target for repair shops and retailers on the weekly Tuesday and Friday routes.",
              },
            ].map((t) => (
              <li
                key={t.title}
                className="rounded-card border border-line bg-surface p-6 shadow-soft"
              >
                <h3 className="text-lg font-semibold">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20" aria-labelledby="story-heading">
          <SectionHeading
            id="story-heading"
            eyebrow={<Eyebrow>An illustrative story</Eyebrow>}
            title="The journey of one dead board"
            description="An example of the route a repair shop's leftovers take, step by step."
          />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="list">
            {STORY.map((card, i) => (
              <li
                key={card.title}
                className="relative rounded-card border border-line bg-surface p-6 shadow-soft"
              >
                <span className="grid size-8 place-items-center rounded-full bg-gold-500 text-sm font-bold text-brand-950">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{card.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted">
            Illustrative example: this story describes the intended pathway, not a documented ReLoop
            case or a measured outcome.
          </p>
        </section>

        <section className="mt-20" aria-labelledby="routes-heading">
          <SectionHeading
            id="routes-heading"
            eyebrow={<Eyebrow>What happens next?</Eyebrow>}
            title="Not every device needs the same destination."
            description="ReLoop helps separate items that can stay in use from material that has genuinely reached end-of-life."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {ROUTES.map((r) => (
              <div
                key={r.title}
                className="rounded-card border border-line bg-surface p-6 shadow-soft"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <r.icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div
            className="rounded-panel border border-line bg-surface p-6 shadow-soft sm:p-10"
            aria-labelledby="goals-heading"
          >
            <h2 id="goals-heading" className="text-2xl font-bold sm:text-3xl">
              What ReLoop is working to solve
            </h2>
            <ul className="mt-6 space-y-3">
              {GOALS.map((g) => (
                <li key={g} className="flex gap-3 leading-relaxed text-ink-soft">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-500"
                    aria-hidden="true"
                  />
                  {g}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-muted">
              ReLoop is in its pilot stage. This page describes intended processes and potential
              pathways; it does not claim measured collection, diversion, emissions savings or
              recycling outcomes.
            </p>
          </div>
          <div className="flex flex-col justify-between rounded-panel bg-brand-950 p-6 text-white sm:p-10">
            <div>
              <Eyebrow tone="dark">Why Jammu</Eyebrow>
              <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                Start local, in Jammu.
              </h2>
              <p className="mt-4 leading-relaxed text-white/70">
                A managed route for used electronics: local collection, clearer inventory
                information, condition assessment, buyer discovery and responsible downstream
                handling.
              </p>
            </div>
            <ButtonLink href="/shop" variant="gold" className="mt-8 self-start">
              Shop graded stock
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </section>

        <section className="mt-16 border-t border-line pt-8" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="font-sans text-sm font-semibold tracking-normal">
            Sources &amp; notes
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-muted">
            {SOURCES.map((s) => (
              <li key={s.text}>
                {s.text}{" "}
                {s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-600 underline"
                  >
                    {s.linkText}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>
      </Container>
    </>
  );
}

import { ArrowRight, Hammer, Recycle, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WasteHotspots } from "./WasteHotspots";

export const metadata: Metadata = {
  title: "Our impact",
  description:
    "Why ReLoop starts in Jammu: giving used electronics another useful life through reuse, repair, refurbishment and responsible recovery.",
};

const STATS = [
  {
    label: "India · FY 2023–24",
    value: "1.75M tonnes",
    body: "National e-waste estimate cited in a December 2024 Rajya Sabha reply.",
  },
  {
    label: "India · FY 2024–25",
    value: "1.94M tonnes",
    body: "National estimate for the following financial year in the same parliamentary reply.",
  },
  {
    label: "ReLoop's starting point",
    value: "Jammu → India",
    body: "Collect and assess locally, then connect suitable inventory with buyers and responsible downstream routes.",
  },
];

const STORY = [
  {
    title: "Used for years",
    body: "The laptop handles classes, browsing and assignments. Over time, its battery weakens and it starts feeling slow.",
  },
  {
    title: "Left in a drawer",
    body: "A newer machine arrives. The old laptop sits unused because its owner is unsure whether it is worth repairing or selling.",
  },
  {
    title: "Assessed by ReLoop",
    body: "Condition, parts, battery, data-handling needs and repair potential are checked. It is then classified for the most suitable next route.",
  },
  {
    title: "Another useful life",
    body: "If repairable, it can be refurbished and used again. If not, suitable components or materials can move through responsible recovery channels.",
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
    body: "Clean, test and accurately describe suitable equipment so another buyer can use it for its next chapter.",
  },
  {
    icon: Recycle,
    title: "Responsible recovery",
    body: "When reuse or repair is no longer suitable, direct end-of-life material to appropriate authorised recycling and recovery channels.",
  },
];

const GOALS = [
  "Make used and repairable electronics easier to identify and assess.",
  "Bring condition, quantity, category and location into one managed inventory process.",
  "Help buyers find tested used devices and parts, with an honest grade on every item.",
  "Keep reuse and repair opportunities separate from genuine end-of-life material.",
  "Make sure only what is truly dead reaches the recycler, through an authorised channel with a receipt.",
];

const SOURCES = [
  {
    text: "Government of India, Rajya Sabha Starred Question No. 264, reply dated 19 Dec 2024: national e-waste estimates of 1.75 million tonnes (FY 2023–24) and 1.94 million tonnes (FY 2024–25).",
    link: "https://rsdebate.nic.in/bitstream/123456789/752961/1/PQ_266_19122024_S264_p27_p29.pdf",
    linkText: "Official reply (PDF)",
  },
  {
    text: "Central Pollution Control Board, E-Waste Management System and E-Waste (Management) Rules, 2022, including the EPR framework and registered-channel requirements.",
    link: "https://www.eprewaste.cpcb.gov.in/",
    linkText: "CPCB E-Waste Portal",
  },
  {
    text: "Ministry of Environment, Forest and Climate Change, PIB release “Generation of E-waste” (27 July 2023), describing CPCB's estimation method and the E-Waste Rules, 2022.",
    link: "https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1943201&lang=2&reg=48",
    linkText: "PIB release",
  },
  {
    text: "Jammu & Kashmir Open Government Data portal, E-Waste dataset catalogue. State/UT-specific figures are not asserted on this page unless an official figure and reporting year are available.",
    link: "https://jk.data.gov.in/keywords/E-Waste",
    linkText: "J&K e-waste data catalogue",
  },
  {
    text: "The laptop story is fictional and illustrative. Descriptions of reuse, repair, data security, safe handling and recovery are explanatory information; ReLoop's operating model and impact metrics remain under development.",
  },
];

export default function ImpactPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-40 -left-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,var(--color-gold-100),transparent)]"
        />
        <Container className="relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:py-20">
          <div className="animate-rise">
            <Eyebrow>Our impact</Eyebrow>
            <h1 className="mt-5 text-5xl leading-[1.02] font-bold sm:text-6xl">
              From <span className="text-gold-700">waste</span>
              <br />
              to another life.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">
              Electronics do not become worthless the moment someone stops using them. A laptop may
              need a repair, a phone may still work, and a circuit board may contain recoverable
              materials. The first question should be:{" "}
              <strong className="text-ink">what useful life can this item have next?</strong>
            </p>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              ReLoop starts in Jammu by creating a clearer route from collection and assessment to
              reuse, repair, refurbishment and responsible recovery.
            </p>
          </div>
          <WasteHotspots />
        </Container>
      </section>

      <Container className="pb-20">
        <section className="grid gap-4 md:grid-cols-3" aria-label="E-waste in numbers">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="rounded-card border border-line bg-surface p-6 shadow-soft"
            >
              <span className="text-xs font-semibold tracking-wider text-muted uppercase">
                {s.label}
              </span>
              <strong className="mt-3 block font-display text-3xl font-bold text-brand-600">
                {s.value}
                {i < 2 && <sup className="ml-0.5 text-xs text-muted">1</sup>}
              </strong>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-20" aria-labelledby="story-heading">
          <SectionHeading
            id="story-heading"
            eyebrow={<Eyebrow>An illustrative story</Eyebrow>}
            title="The journey of one old laptop"
            description="Imagine a student in Jammu replaces a four-year-old laptop. It is no longer fast enough for its first job — but that does not make it waste."
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
            Illustrative example: this story describes the intended circular pathway, not a
            documented ReLoop case or a measured impact outcome.
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
                Start local, connect nationally.
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

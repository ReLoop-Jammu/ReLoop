import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CtaBanner } from "@/components/marketing/CtaBanner";
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
    art: "💻",
    title: "Used for years",
    body: "The laptop handles classes, browsing and assignments. Over time, its battery weakens and it starts feeling slow.",
  },
  {
    art: "🗄️",
    title: "Left in a drawer",
    body: "A newer machine arrives. The old laptop sits unused because its owner is unsure whether it is worth repairing or selling.",
  },
  {
    art: "🔍",
    title: "Assessed by ReLoop",
    body: "Condition, parts, battery, data-handling needs and repair potential are checked. It is then classified for the most suitable next route.",
  },
  {
    art: "♻️",
    title: "Another useful life",
    body: "If repairable, it can be refurbished and used again. If not, suitable components or materials can move through responsible recovery channels.",
  },
];

const ROUTES = [
  {
    icon: "🛠️",
    title: "Repair",
    body: "Fix a fault, test the device and return it to useful service where repair is practical.",
  },
  {
    icon: "✨",
    title: "Refurbish & reuse",
    body: "Clean, test and accurately describe suitable equipment so another buyer can use it for its next chapter.",
  },
  {
    icon: "♻️",
    title: "Responsible recovery",
    body: "When reuse or repair is no longer suitable, direct end-of-life material to appropriate authorised recycling and recovery channels.",
  },
];

const GOALS = [
  "Make used and repairable electronics easier to identify and assess.",
  "Bring condition, quantity, category and location into one managed inventory process.",
  "Help buyers discover suitable used devices, components and bulk lots.",
  "Keep reuse and repair opportunities separate from genuine end-of-life material.",
  "Create a clearer, more traceable route from Jammu collection to demand across India.",
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
    <Container className="py-10 sm:py-16">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <Eyebrow>♻ ReLoop · Our impact</Eyebrow>
          <h1 className="mt-5 text-5xl leading-[0.95] font-black tracking-tighter sm:text-6xl">
            From <span className="text-accent-strong">waste</span>
            <br />
            to another life.
          </h1>
          <p className="text-muted mt-6 leading-relaxed">
            Electronics do not become worthless the moment someone stops using them. A laptop may
            need a repair, a phone may still work, and a circuit board may contain recoverable
            materials. The first question should be:{" "}
            <strong className="text-ink">what useful life can this item have next?</strong>
          </p>
          <p className="text-muted mt-4 leading-relaxed">
            ReLoop starts in Jammu by creating a clearer route from collection and assessment to
            reuse, repair, refurbishment and responsible recovery.
          </p>
        </div>
        <WasteHotspots />
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3" aria-label="E-waste in numbers">
        {STATS.map((s, i) => (
          <div key={s.label} className="rounded-card border-line bg-surface border p-6">
            <span className="text-muted text-[11px] font-extrabold tracking-wider uppercase">
              {s.label}
            </span>
            <strong className="text-primary mt-2 block text-3xl font-black">
              {s.value}
              {i < 2 && <sup className="text-muted ml-0.5 text-xs">1</sup>}
            </strong>
            <p className="text-muted mt-2 text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-16" aria-labelledby="story-heading">
        <SectionHeading
          eyebrow={<Eyebrow>An illustrative story</Eyebrow>}
          title={<span id="story-heading">The journey of one old laptop</span>}
          description="Imagine a student in Jammu replaces a four-year-old laptop. The device is no longer fast enough for its first job — but that does not automatically make it waste."
        />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="list">
          {STORY.map((card, i) => (
            <li
              key={card.title}
              className="rounded-card border-line bg-surface relative border p-6"
            >
              <span className="bg-primary absolute top-4 right-4 grid size-7 place-items-center rounded-full text-xs font-black text-white">
                {i + 1}
              </span>
              <div className="text-4xl" aria-hidden="true">
                {card.art}
              </div>
              <h3 className="mt-3 font-extrabold">{card.title}</h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">{card.body}</p>
            </li>
          ))}
        </ol>
        <p className="text-muted mt-4 text-xs">
          Illustrative example: this story describes the intended circular pathway, not a documented
          ReLoop case or a measured impact outcome.
        </p>
      </section>

      <section className="mt-16" aria-labelledby="routes-heading">
        <SectionHeading
          eyebrow={<Eyebrow>What happens next?</Eyebrow>}
          title={<span id="routes-heading">Not every device needs the same destination.</span>}
          description="ReLoop's role is to help separate items that can stay in use from material that has genuinely reached end-of-life."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {ROUTES.map((r) => (
            <div key={r.title} className="rounded-card border-line bg-surface border p-6">
              <div className="text-3xl" aria-hidden="true">
                {r.icon}
              </div>
              <h3 className="mt-3 font-extrabold">{r.title}</h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <CtaBanner
          title="Why ReLoop starts in Jammu"
          description="We are building a managed route for used electronics: local collection, clearer inventory information, condition assessment, buyer discovery and responsible downstream handling."
          action={
            <ButtonLink
              href="/listings"
              size="lg"
              className="bg-accent text-primary-strong hover:bg-accent"
            >
              Explore marketplace →
            </ButtonLink>
          }
        />
      </section>

      <section
        className="rounded-card border-line bg-surface mt-10 border p-6 sm:p-8"
        aria-labelledby="goals-heading"
      >
        <h2 id="goals-heading" className="text-2xl font-black">
          What ReLoop is working to solve
        </h2>
        <ul className="text-muted mt-4 list-disc space-y-2 pl-5 leading-relaxed">
          {GOALS.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <p className="text-muted mt-4 text-xs leading-relaxed">
          ReLoop is a developing marketplace concept. This page describes intended processes and
          potential pathways; it does not claim measured collection, diversion, emissions savings or
          recycling outcomes.
        </p>
      </section>

      <section className="border-line mt-10 border-t pt-6" aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="text-sm font-extrabold">
          Sources &amp; notes
        </h2>
        <ol className="text-muted mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed">
          {SOURCES.map((s) => (
            <li key={s.text}>
              {s.text}{" "}
              {s.link && (
                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-semibold underline"
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
  );
}

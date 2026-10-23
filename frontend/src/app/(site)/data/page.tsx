import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { OPEN_DATA } from "@/features/transparency/open-data";

export const metadata: Metadata = {
  title: "Download our figures",
  description:
    "The pilot's public figures as CSV files, with a data dictionary. Dates, categories, counts and kg only.",
};

export default function OpenDataPage() {
  return (
    <Container className="py-12 sm:py-16">
      <Eyebrow>Transparency</Eyebrow>
      <h1 className="mt-5 text-4xl leading-[1.02] font-bold sm:text-6xl">Download our figures</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">
        The same numbers as the impact, network, ledger and report pages, as CSV files. They hold
        dates, categories, counts and kilograms only: no names, contacts or prices. Updated every
        five minutes.
      </p>
      <div className="mt-10 space-y-8">
        {OPEN_DATA.map((d) => (
          <section
            key={d.file}
            aria-labelledby={`f-${d.file}`}
            className="rounded-card border border-line bg-surface p-6 shadow-soft"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`f-${d.file}`} className="text-xl font-bold">
                {d.title}
              </h2>
              <a href={`/data/${d.file}`} className="font-semibold text-brand-600 underline">
                {d.file}
              </a>
            </div>
            <p className="mt-1 text-sm text-muted">{d.about}</p>
            <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
              {d.columns.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-mono text-xs leading-6">{k}</dt>
                  <dd className="text-ink-soft">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Container>
  );
}

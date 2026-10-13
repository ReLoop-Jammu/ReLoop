import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { DRIVE_LINK, LOCATIONS } from "@/config/locations";
import { DriveQr, Sheet } from "@/features/print/Sheet";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Awareness-drive flyer (A4)" };

const STEPS = [
  {
    title: "Sell or drop off",
    body: `Repair shops and retailers: our ${LOCATIONS.route.days.join(" and ")} pickup route. Colleges and offices: book a pickup. Households: drop off at the hub or a partner shop from ${SITE.hubOpens}.`,
  },
  {
    title: "We grade it at our Jammu hub",
    body: "Every item gets an RL-JMU tag and a grade from A to D. Phones and drives are wiped before anything is listed.",
  },
  {
    title: "It gets its next life",
    body: `What works is resold, what can be fixed is repaired, good parts are reused. Only what is truly dead, and loose or swollen batteries, go to the authorised recycler, ${LOCATIONS.recycler.name}.`,
  },
];

export default function AwarenessFlyerPage() {
  return (
    <Sheet>
      <header className="bg-brand-950 px-[16mm] pt-[10mm] pb-[9mm] text-white">
        <Logo id="flyer" inverted className="origin-left scale-125" />
        <h1 className="mt-[7mm] font-display text-[34pt] leading-[1.05] font-bold text-white">
          Old electronics don&apos;t belong in a drawer, or in the bin.
        </h1>
      </header>

      <div className="flex flex-1 flex-col px-[16mm] pt-[8mm]">
        <section aria-labelledby="why-heading">
          <h2
            id="why-heading"
            className="text-[12pt] font-semibold tracking-[0.12em] text-brand-600 uppercase"
          >
            Why it matters
          </h2>
          <div className="mt-[4mm] grid grid-cols-2 gap-[5mm]">
            {[
              ["1.75 million tonnes", "of e-waste in India in FY 2023–24¹"],
              ["1.94 million tonnes", "estimated for FY 2024–25¹"],
            ].map(([value, label]) => (
              <div key={value} className="rounded-[4mm] bg-sunken p-[5mm]">
                <p className="font-display text-[22pt] leading-tight font-bold text-brand-950">
                  {value}
                </p>
                <p className="mt-[1mm] text-[11.5pt] text-ink-soft">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-[4mm] text-[11.5pt] leading-snug text-ink-soft">
            In Jammu, old phones, laptops and chargers pile up in repair shops, offices and homes.
            Much of it still works or can be fixed. Batteries and boards need safe handling, not the
            scrap heap.
          </p>
        </section>

        <section aria-labelledby="how-heading" className="mt-[7mm]">
          <h2
            id="how-heading"
            className="text-[12pt] font-semibold tracking-[0.12em] text-brand-600 uppercase"
          >
            How ReLoop works
          </h2>
          <ol className="mt-[4mm] grid gap-[3.5mm]">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-[5mm]">
                <span className="grid size-[11mm] shrink-0 place-items-center rounded-full bg-brand-600 font-display text-[16pt] font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[13.5pt] font-bold">{s.title}</p>
                  <p className="mt-[0.5mm] text-[11pt] leading-snug text-ink-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-[7mm] flex items-center gap-[8mm] rounded-[5mm] border-2 border-brand-600 p-[5mm]">
          <DriveQr size="40mm" />
          <div>
            <p className="font-display text-[19pt] leading-tight font-bold">Scan to find ReLoop</p>
            <p className="mt-[1mm] text-[11pt] text-ink-soft">
              The hub, our pickup route and what we accept
            </p>
            {SITE.supportPhone && (
              <p className="mt-[3mm] text-[12pt]">
                WhatsApp <strong className="text-[15pt]">{SITE.supportPhone}</strong>
              </p>
            )}
            <p className="mt-[1mm] font-mono text-[9pt] text-muted">
              {DRIVE_LINK.publicUrl.replace("https://", "")}
            </p>
          </div>
        </div>

        <footer className="mt-auto mb-[9mm] border-t border-line pt-[3mm] text-[7.5pt] leading-snug text-muted">
          ¹ Government of India, Rajya Sabha Starred Question No. 264, reply dated 19 December 2024
          (rsdebate.nic.in). See also the PIB release “Generation of E-waste”, 27 July 2023
          (pib.gov.in), and the CPCB E-Waste portal (eprewaste.cpcb.gov.in). These are national
          figures; no official Jammu figure is published for these years.
        </footer>
      </div>
    </Sheet>
  );
}

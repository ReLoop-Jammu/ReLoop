import { Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { WhatsAppButton } from "@/features/sell/components/WhatsAppButton";
import { getSiteSettings } from "@/features/settings/server";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "Our scrap prices (per kg)",
  description:
    "What ReLoop pays per kilo for scrap from shops in Jammu: screens, batteries, dead motherboards and everything else. Weighed in front of you, paid by UPI on the spot.",
  alternates: { canonical: "/rate-card" },
};

const dateLabel = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : iso;

export default async function RateCardPage() {
  const site = await getSiteSettings();
  const rows: { category: string; paise: number; covers: string; not: string }[] = [
    {
      category: "Screens and displays",
      paise: site.rateScreensPaise,
      covers: "Loose phone, tablet and laptop display assemblies.",
      not: "Whole monitors and laptops are devices: they get an offer after testing. TV panels are refused.",
    },
    {
      category: "Batteries",
      paise: site.rateBatteriesPaise,
      covers:
        "Lithium phone, laptop and tablet cells. A swollen cell that isn't leaking goes in a fire-safe bag to our sand cabinet.",
      not: "Lead-acid batteries are not accepted. Leaking cells are refused.",
    },
    {
      category: "Dead motherboards",
      paise: site.rateBoardsPaise,
      covers: "Phone, laptop and tablet boards that don't work.",
      not: "A board that works is a part: it is tested and priced one by one.",
    },
    {
      category: "Everything else",
      paise: site.rateOtherPaise,
      covers: "Phone and laptop repair leftovers: covers, sensors, accessories.",
      not: "TVs, printers, UPS units and small appliances are refused, even at this rate.",
    },
  ];
  return (
    <Container className="py-12 sm:py-20">
      <div className="max-w-3xl">
        <Eyebrow>Our scrap prices (per kg)</Eyebrow>
        <h1 className="mt-5 text-4xl leading-[1.02] font-bold sm:text-6xl">What we pay per kilo</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          For scrap from repair shops, retailers and exchange stores. Weighed in front of you and
          paid by UPI on the spot, with a receipt. As of {dateLabel(site.rateCardAsOf)}.
        </p>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Our scrap prices (per kg)"
        className="mt-10 overflow-x-auto rounded-card border border-line bg-surface shadow-soft"
      >
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">ReLoop scrap prices per kg</caption>
          <thead className="bg-sunken text-xs text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">
                Category
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                ReLoop pays
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                What counts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.category}>
                <th scope="row" className="px-5 py-4 align-top font-semibold">
                  {r.category}
                </th>
                <td className="px-5 py-4 text-right align-top font-display text-xl font-bold whitespace-nowrap text-brand-600 tabular-nums">
                  {formatPrice(r.paise)}{" "}
                  <span className="text-sm font-normal text-muted">/ kg</span>
                </td>
                <td className="px-5 py-4 align-top text-ink-soft">
                  {r.covers}
                  <span className="mt-1 block text-muted">{r.not}</span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="px-5 py-4 align-top font-semibold">
                Working parts
              </th>
              <td className="px-5 py-4 text-right align-top font-semibold">Priced one by one</td>
              <td className="px-5 py-4 align-top text-ink-soft">
                Boards, cameras, charging ports, RAM, SSDs and healthy batteries are tested and paid
                as parts, not by the kilo. You can decline, or list them yourself on the Parts
                Exchange.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-2" role="list">
        {[
          "Paid by UPI on the spot, weighed in front of you.",
          "We take the junk informal dealers don't: ₹5 a kg.",
          "A fixed weekly pickup day: Tuesday for the Gandhi Nagar cluster, Friday for the old city.",
          "Working parts are paid as parts, not by the kilo. A working board can fetch about ₹2,500 as a part, against ₹20 to ₹30 as scrap (field interviews, October 2026).",
          "Our rates are level with the informal dealer rates we recorded in Jammu's markets (field interviews, October 2026).",
        ].map((t) => (
          <li key={t} className="flex gap-3 text-ink-soft">
            <Check className="mt-0.5 size-5 shrink-0 text-grade-a" aria-hidden="true" />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <section className="mt-12 max-w-3xl" aria-labelledby="fine-print-heading">
        <h2 id="fine-print-heading" className="text-2xl font-bold">
          The fine print
        </h2>
        <ul className="mt-4 grid gap-3 text-ink-soft" role="list">
          <li className="flex gap-3">
            <X className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            <span>
              We don&apos;t take TVs, printers, UPS units, small appliances, lead-acid batteries or
              anything from homes: we buy from shops, retailers and institutions only.
            </span>
          </li>
          <li className="flex gap-3">
            <Check className="mt-0.5 size-5 shrink-0 text-grade-a" aria-hidden="true" />
            <span>
              By handing over scrap you confirm it is yours to sell, and that you may sell the parts
              you leave to be tested. Each weighing keeps a copy of the rates used, so a later
              change never touches your receipt.
            </span>
          </li>
          <li className="flex gap-3">
            <Check className="mt-0.5 size-5 shrink-0 text-grade-a" aria-hidden="true" />
            <span>
              Boards and storage you hand over are wiped, or the storage chip destroyed, before any
              part is listed. Only tested-working parts go to labs and makers; anything dead goes
              only to VRRG Group, our licensed recycler.
            </span>
          </li>
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <WhatsAppButton message="Hi ReLoop, I run a repair shop and would like to become a partner" />
          <Link href="/sell/shops" className="font-semibold text-brand-600 underline">
            Become a partner shop
          </Link>
          <Link href="/what-we-accept" className="font-semibold text-brand-600 underline">
            What we accept
          </Link>
        </div>
      </section>
    </Container>
  );
}

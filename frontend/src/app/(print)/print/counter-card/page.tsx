import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { LOCATIONS } from "@/config/locations";
import { RateCardQr, Sheet } from "@/features/print/Sheet";
import { getSiteSettings } from "@/features/settings/server";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = { title: "Shopkeeper counter card (A4)" };

export default async function CounterCardPage() {
  const site = await getSiteSettings();
  const rows: [string, number][] = [
    ["Screens and displays", site.rateScreensPaise],
    ["Batteries", site.rateBatteriesPaise],
    ["Dead motherboards", site.rateBoardsPaise],
    ["Everything else", site.rateOtherPaise],
  ];
  return (
    <Sheet>
      <header className="flex items-center justify-between bg-brand-950 px-[16mm] py-[10mm]">
        <Logo id="card" inverted className="origin-left scale-150" />
        <span className="text-[13pt] font-semibold text-gold-400">Jammu</span>
      </header>

      <div className="flex flex-1 flex-col px-[16mm] pt-[11mm]">
        <p className="text-[15pt] font-semibold tracking-[0.14em] text-brand-600 uppercase">
          ReLoop partner shop
        </p>
        <h1 className="mt-[3mm] font-display text-[40pt] leading-[1.04] font-bold">
          Repair leftovers, paid by the kilo
        </h1>
        <p className="mt-[4mm] text-[15pt] leading-snug text-ink-soft">
          Weighed in front of you. Paid by UPI on the spot. A receipt every time.
        </p>

        <table className="mt-[8mm] w-full text-left text-[17pt]">
          <caption className="sr-only">ReLoop rate card per kilo</caption>
          <tbody className="divide-y-2 divide-line">
            {rows.map(([label, paise]) => (
              <tr key={label}>
                <th scope="row" className="py-[3.2mm] font-semibold">
                  {label}
                </th>
                <td className="py-[3.2mm] text-right font-display text-[22pt] font-bold text-brand-600 tabular-nums">
                  {formatPrice(paise)}{" "}
                  <span className="text-[12pt] font-normal text-muted">/ kg</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-[3mm] text-[12pt] text-ink-soft">
          Working parts are tested and paid as parts, not by the kilo. As of {site.rateCardAsOf}.
        </p>

        <div className="mt-[7mm] grid grid-cols-2 gap-[5mm] text-[13pt] leading-snug">
          <div className="rounded-[4mm] bg-sunken p-[5mm]">
            <p className="font-bold">A fixed weekly pickup day</p>
            <p className="mt-[1mm] text-ink-soft">
              Tuesday: {LOCATIONS.routes[0].markets.join(", ")}. Friday:{" "}
              {LOCATIONS.routes[1].markets.join(", ")}.
            </p>
          </div>
          <div className="rounded-[4mm] bg-sunken p-[5mm]">
            <p className="font-bold">Not taken</p>
            <p className="mt-[1mm] text-ink-soft">
              TVs, printers, UPS units, small appliances, lead-acid or leaking batteries.
            </p>
          </div>
        </div>

        <div className="mt-auto mb-[14mm] flex items-center gap-[10mm] rounded-[6mm] bg-sunken p-[8mm]">
          <RateCardQr size="52mm" />
          <div>
            <p className="font-display text-[22pt] leading-tight font-bold">The live rate card</p>
            <p className="mt-[2mm] text-[13pt] text-ink-soft">Scan for today&apos;s rates</p>
            {site.supportPhone && (
              <p className="mt-[6mm] text-[13pt]">
                WhatsApp
                <span className="block font-display text-[24pt] font-bold">
                  {site.supportPhone}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

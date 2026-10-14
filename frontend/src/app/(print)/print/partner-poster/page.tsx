import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { DRIVE_LINK, LOCATIONS } from "@/config/locations";
import { DriveQr, Sheet } from "@/features/print/Sheet";
import { getSiteSettings } from "@/features/settings/server";

export const metadata: Metadata = { title: "Partner-shop poster (A4)" };

const TAKES = ["Phones", "Laptops", "Chargers", "Cables", "Small appliances", "Batteries"];

export default async function PartnerPosterPage() {
  const site = await getSiteSettings();
  return (
    <Sheet>
      <header className="flex items-center justify-between bg-brand-950 px-[16mm] py-[10mm]">
        <Logo id="poster" inverted className="origin-left scale-150" />
        <span className="text-[13pt] font-semibold text-gold-400">Jammu</span>
      </header>

      <div className="flex flex-1 flex-col px-[16mm] pt-[14mm]">
        <p className="text-[15pt] font-semibold tracking-[0.14em] text-brand-600 uppercase">
          ReLoop partner
        </p>
        <h1 className="mt-[4mm] font-display text-[50pt] leading-[1.02] font-bold">
          Drop old electronics here
        </h1>
        <p className="mt-[6mm] text-[17pt] leading-snug text-ink-soft">
          Working, broken or dead. This shop passes them to ReLoop, and we give each one its next
          useful life.
        </p>

        <ul className="mt-[9mm] flex flex-wrap gap-[3mm]">
          {TAKES.map((t) => (
            <li
              key={t}
              className="rounded-full border-2 border-brand-600 px-[5mm] py-[1.6mm] text-[14pt] font-semibold text-brand-600"
            >
              {t}
            </li>
          ))}
        </ul>

        <ol className="mt-[11mm] grid gap-[4mm] text-[14pt] leading-snug">
          <li>
            <strong>1. Graded</strong> at our Jammu hub, A to D, with data wiped.
          </li>
          <li>
            <strong>2. Reused</strong>: resold, repaired, or good parts taken out.
          </li>
          <li>
            <strong>3. Only what is truly dead</strong> goes to the authorised recycler,{" "}
            {LOCATIONS.recycler.name}, weighed, with a receipt.
          </li>
        </ol>

        <div className="mt-auto mb-[14mm] flex items-center gap-[10mm] rounded-[6mm] bg-sunken p-[8mm]">
          <DriveQr size="58mm" />
          <div>
            <p className="font-display text-[22pt] leading-tight font-bold">Scan to find us</p>
            <p className="mt-[2mm] text-[13pt] text-ink-soft">
              Hub, pickup route and where scrap goes
            </p>
            {site.supportPhone && (
              <p className="mt-[7mm] text-[13pt]">
                WhatsApp
                <span className="block font-display text-[24pt] font-bold">
                  {site.supportPhone}
                </span>
              </p>
            )}
            <p className="mt-[3mm] font-mono text-[10pt] text-muted">
              {DRIVE_LINK.publicUrl.replace("https://", "")}
            </p>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

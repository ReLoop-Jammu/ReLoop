import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { PartnerBadgeQr, Sheet } from "@/features/print/Sheet";

export const metadata: Metadata = { title: "ReLoop Partner window badge (A5)" };

/** The A5 badge a partner shop puts in its window: tested parts from ReLoop, and where to find the hub. */
export default function PartnerBadgePage() {
  return (
    <Sheet size="A5">
      <header className="flex items-center justify-between bg-brand-950 px-[12mm] py-[8mm]">
        <Logo id="badge" inverted className="origin-left scale-125" />
        <span className="text-[12pt] font-semibold text-gold-400">Jammu</span>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-[12mm] text-center">
        <p className="text-[13pt] font-semibold tracking-[0.16em] text-brand-600 uppercase">
          ReLoop Partner
        </p>
        <h1 className="mt-[4mm] font-display text-[34pt] leading-[1.05] font-bold">
          Tested parts from ReLoop
        </h1>
        <p className="mt-[4mm] text-[13pt] leading-snug text-ink-soft">
          This shop sells its repair leftovers to ReLoop by weight, and can get tested parts from
          the ReLoop hub in Gandhi Nagar.
        </p>
        <div className="mt-[8mm]">
          <PartnerBadgeQr size="42mm" />
        </div>
        <p className="mt-[3mm] text-[10pt] text-muted">
          Scan for the hub, the routes and the shops
        </p>
      </div>
      <footer className="border-t border-line px-[12mm] py-[5mm] text-center text-[9pt] text-muted">
        re-loop-ochre.vercel.app/locations
      </footer>
    </Sheet>
  );
}

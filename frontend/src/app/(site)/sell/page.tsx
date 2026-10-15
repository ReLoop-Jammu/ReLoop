import { ArrowRight, Building2, PackageCheck, Store, Wrench, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SellQuickLinks } from "@/features/sell/components/SellPageHeader";
import { getSiteSettings } from "@/features/settings/server";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "For shops & institutions",
  description:
    "Repair shops, retailers, exchange stores and institutions in Jammu: sell scrap by the kilo at the rate card, devices at an offer after testing, and list tested parts on the Parts Exchange.",
};

const PATHS: {
  href: string;
  icon: LucideIcon;
  title: string;
  who: string;
  body: string;
  cta: string;
}[] = [
  {
    href: "/sell/shops",
    icon: Store,
    title: "Repair shops, retailers & exchange stores",
    who: "Bahu Plaza, Gole Market, Raghunath Bazaar, Residency Road",
    body: "A fixed weekly pickup day. Scrap is weighed in front of you and paid by UPI on the spot. Dead handsets and trade-ins get an offer after testing.",
    cta: "Become a partner shop",
  },
  {
    href: "/sell/institutions",
    icon: Building2,
    title: "Colleges, schools, banks & offices",
    who: "Bulk lots of desktops, laptops and monitors",
    body: "We pick up, sort on site, buy the working and repairable equipment and give you a handover record. Dead e-waste goes straight to VRRG Group in your name.",
    cta: "Book a lot pickup",
  },
];

export default async function SellPage() {
  const site = await getSiteSettings();
  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <Eyebrow>For shops & institutions</Eyebrow>
            <h1 className="mt-4 text-4xl font-bold sm:text-6xl">
              Run a repair shop, store or office? We buy what still has a life in it.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              Scrap is paid at the rate card. Each working device gets an offer after testing that
              you can decline. Working parts are priced one by one after testing, or you can list
              them yourself on the Jammu Parts Exchange. We buy from shops, retailers and
              institutions only, not from homes.
            </p>
            <SellQuickLinks />
          </div>
          <ul className="mt-12 grid gap-4 lg:grid-cols-2" role="list">
            {PATHS.map(({ href, icon: Icon, title, who, body, cta }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-panel border border-line bg-canvas p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-7"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-600 text-white">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold">{title}</h2>
                  <p className="mt-1 text-sm font-medium text-gold-700">{who}</p>
                  <p className="mt-3 leading-relaxed text-ink-soft">{body}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 font-semibold text-brand-600">
                    {cta}
                    <ArrowRight
                      className="size-4 transition group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-16 sm:py-20">
        <section aria-labelledby="pay-heading">
          <Eyebrow>How we pay</Eyebrow>
          <h2 id="pay-heading" className="mt-3 text-3xl font-bold sm:text-4xl">
            Three ways, all written down
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3" role="list">
            <li className="rounded-card border border-line bg-surface p-6 shadow-soft">
              <PackageCheck className="size-6 text-brand-600" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold">Scrap, by the kilo</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Screens {formatPrice(site.rateScreensPaise)}, batteries{" "}
                {formatPrice(site.rateBatteriesPaise)}, dead motherboards{" "}
                {formatPrice(site.rateBoardsPaise)} and everything else{" "}
                {formatPrice(site.rateOtherPaise)} a kg. Weighed in front of you, paid by UPI on the
                spot, with a receipt.{" "}
                <Link href="/rate-card" className="font-semibold text-brand-600 underline">
                  The full rate card
                </Link>
                .
              </p>
            </li>
            <li className="rounded-card border border-line bg-surface p-6 shadow-soft">
              <Wrench className="size-6 text-brand-600" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold">Devices, an offer after testing</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Dead handsets, trade-ins and old PCs are tested at the hub and graded A to D. You
                get an offer for each lot and can decline. Before any device is bought you confirm
                that you own it or have it signed over.
              </p>
            </li>
            <li className="rounded-card border border-line bg-surface p-6 shadow-soft">
              <Store className="size-6 text-brand-600" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold">Working parts, one by one</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Working parts are priced one by one after testing. You can decline, or list them
                yourself on the Parts Exchange: staff test and approve each listing, and the shop is
                named on it.
              </p>
            </li>
          </ul>
        </section>
      </Container>
    </>
  );
}

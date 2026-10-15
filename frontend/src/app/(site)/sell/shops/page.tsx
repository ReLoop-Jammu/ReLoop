import { Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ShopSubmissionForm } from "@/features/sell/components/ShopSubmissionForm";
import { BenefitList, SellPageHeader } from "@/features/sell/components/SellPageHeader";
import { getSiteSettings } from "@/features/settings/server";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "Partner shops",
  description:
    "Repair shops, retailers and exchange stores in Jammu: a fixed weekly pickup, scrap paid by the kilo by UPI on the spot, offers for dead handsets and trade-ins, and the Jammu Parts Exchange.",
};

export default async function ShopsPage() {
  const site = await getSiteSettings();
  return (
    <Container className="py-12 sm:py-16">
      <SellPageHeader
        icon={Store}
        eyebrow="Repair shops, retailers & exchange stores"
        title="Turn repair leftovers into money, every week"
      >
        <p>
          Broken screens, dead batteries and boards, swapped parts and leftover junk are weighed and
          paid by the kilo on a fixed weekly pickup day. Dead handsets and trade-ins you won&apos;t
          resell get an offer after testing.
        </p>
      </SellPageHeader>
      <div className="mt-10">
        <BenefitList
          items={[
            {
              title: "Paid by UPI on the spot",
              body: `Weighed in front of you, at the rate card (screens ${formatPrice(site.rateScreensPaise)} a kg, batteries ${formatPrice(site.rateBatteriesPaise)}, dead motherboards ${formatPrice(site.rateBoardsPaise)}, everything else ${formatPrice(site.rateOtherPaise)}). A receipt every time.`,
            },
            {
              title: "A fixed weekly pickup day",
              body: "Tuesday for the Gandhi Nagar cluster (Bahu Plaza, Gole Market). Friday for the old city (Raghunath Bazaar, Residency Road). The routes and their start dates are on the locations page. Retailers: monthly, or when a bag fills.",
            },
            {
              title: "Working parts paid as parts",
              body: "Likely-working parts go in a to-test bag under your name. Within 24 hours each tested part is tagged and paid at its part price, on its own receipt line.",
            },
            {
              title: "List parts on the Parts Exchange",
              body: `Verified partner shops can list parts they harvest. Staff test and approve each listing, and your shop is named on it. ReLoop records a ${site.commissionPct}% commission when it sells, handles the 7-day return and pays your share after day 7.`,
            },
            {
              title: "Paid repair work",
              body: "Partner shops can repair our grade-B devices for a fixed fee per job.",
            },
            {
              title: "Dead stock handled by weight",
              body: "What can't be reused is handed to VRRG Group, our dismantling partner, on a weight receipt.",
            },
          ]}
        />
        <p className="mt-4 text-sm text-muted">
          By handing over scrap you confirm it is yours to sell, and that you may sell the parts you
          leave to be tested.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/rate-card" className="font-semibold text-brand-600 underline">
            The rate card
          </Link>
          {" · "}
          <Link href="/locations" className="font-semibold text-brand-600 underline">
            The pickup routes and stops on the map
          </Link>
        </p>
      </div>
      <section className="mt-14 max-w-3xl" aria-labelledby="signup-heading">
        <h2 id="signup-heading" className="text-2xl font-bold sm:text-3xl">
          Offer a lot of devices
        </h2>
        <p className="mt-2 text-muted">
          Tell us about your shop and add the devices in one submission. Everything goes privately
          to our team for review, and you get an offer you can decline.{" "}
          <Link href="/help" className="font-semibold text-brand-600 underline">
            Step-by-step help, in English and Hindi
          </Link>
          .
        </p>
        <div className="mt-6">
          <ShopSubmissionForm />
        </div>
      </section>
    </Container>
  );
}

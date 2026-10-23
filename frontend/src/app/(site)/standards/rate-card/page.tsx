import type { Metadata } from "next";
import Link from "next/link";
import { StandardPage } from "@/components/marketing/StandardPage";
import { getSiteSettings } from "@/features/settings/server";
import { formatPrice } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "Scrap prices standard",
  description:
    "How ReLoop weighs and pays for scrap by the kilo, what each category covers, and what we don't take.",
};

export default async function RateCardStandardPage() {
  const site = await getSiteSettings();
  return (
    <StandardPage
      title="Scrap prices standard"
      lead={
        <>
          Scrap is bought by weight at one published list of scrap prices, the same for every shop.
          The live rates are on the{" "}
          <Link href="/rate-card" className="font-semibold text-brand-600 underline">
            scrap prices
          </Link>
          , with the date they were set.
        </>
      }
      sections={[
        {
          title: "Weighed in front of you",
          body: (
            <p>
              Each category is weighed on the hub&apos;s scale at your counter. You see the weight,
              the rate and the total before you are paid by UPI on the spot, and you get a numbered
              receipt with every line.
            </p>
          ),
        },
        {
          title: "The categories",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-ink">Screens</strong> ({formatPrice(site.rateScreensPaise)}{" "}
                a kg): loose phone, tablet and laptop display assemblies only.
              </li>
              <li>
                <strong className="text-ink">Batteries</strong> (
                {formatPrice(site.rateBatteriesPaise)} a kg): lithium phone, laptop and tablet
                cells. Swollen cells go in a fire-safe bag; leaking cells and lead-acid batteries
                are not taken.
              </li>
              <li>
                <strong className="text-ink">Dead motherboards</strong> (
                {formatPrice(site.rateBoardsPaise)} a kg).
              </li>
              <li>
                <strong className="text-ink">Everything else</strong> (
                {formatPrice(site.rateOtherPaise)} a kg): phone and laptop repair leftovers.
              </li>
            </ul>
          ),
        },
        {
          title: "Working parts are not scrap",
          body: (
            <p>
              Parts that may work go in a to-test bag under your name. Each one is priced on its own
              after testing; you can decline, or list it yourself in our used parts shop.
            </p>
          ),
        },
        {
          title: "What we don't take",
          body: (
            <p>
              Televisions, printers, UPS units and small appliances, even by the kilo; leaking or
              lead-acid batteries; and anything the seller does not own. See{" "}
              <Link href="/what-we-accept" className="font-semibold text-brand-600 underline">
                what we accept
              </Link>
              .
            </p>
          ),
        },
      ]}
    />
  );
}

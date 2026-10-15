import type { Metadata } from "next";
import Link from "next/link";
import { ContactDetail, LegalPage } from "@/components/legal/LegalPage";
import { getSiteSettings } from "@/features/settings/server";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for buying from and selling to ReLoop.",
};

export default async function TermsPage() {
  const site = await getSiteSettings();
  return (
    <LegalPage title="Terms of use" updated={SITE.legalUpdated}>
      <section>
        <h2>About these terms</h2>
        <p>
          These terms apply when you buy from or sell to ReLoop, run by{" "}
          {SITE.legalName ?? SITE.name}. By using the site you agree to them. If you do not agree,
          please do not use ReLoop.
        </p>
      </section>

      <section>
        <h2>What ReLoop does</h2>
        <p>
          ReLoop buys used and broken electronics, tests and grades each item at its hub in Jammu,
          and resells what can be reused. During the pilot, any sample items shown in the shop are
          samples and no sales are processed.
        </p>
      </section>

      <section>
        <h2>Selling to ReLoop</h2>
        <ul>
          <li>
            Only sell items you own or have the right to sell. Before ReLoop buys a device or scrap
            you confirm this with a recorded tick (the date, the staff member present and the
            declaration wording are kept with the purchase record, without any details of an
            original owner).
          </li>
          <li>
            Prices shown on this site are rough estimates only. ReLoop inspects each item and
            confirms an outright purchase offer before the seller accepts. If accepted, the agreed
            amount is paid directly; no consignment share or commission is deducted. The final price
            is set after we test the item, and you may decline it.
          </li>
          <li>
            Remove personal data where you can. We also wipe phones, laptops and drives before
            resale.
          </li>
        </ul>
      </section>

      <section>
        <h2>Listing parts on the Jammu Parts Exchange</h2>
        <ul>
          <li>
            Verified partner shops can list tested-working parts they harvest. A listing is not live
            until ReLoop staff test and approve the part. By listing a part the shop agrees to be
            named on it (&ldquo;Listed by the shop, its market&rdquo;).
          </li>
          <li>
            The buyer pays ReLoop, and ReLoop is the seller of record and the buyer&apos;s contact
            for any return. ReLoop records a 12% commission when a shop-listed part sells and pays
            the shop the rest after the 7-day return window, unless the part was refunded.
          </li>
          <li>
            A part can be returned within 7 days of the sale if it is faulty, doesn&apos;t work when
            fitted or doesn&apos;t fit the stated model, as long as it is undamaged (no burns, tag
            sticker intact). ReLoop checks it, then refunds or swaps it. There are no change-of-mind
            returns.
          </li>
        </ul>
      </section>

      <section>
        <h2>Items we do not accept</h2>
        <ul>
          <li>
            TVs, printers, UPS units and small appliances, lead-acid or leaking batteries, and
            anything from homes: we buy from shops, retailers and institutions only.
          </li>
          <li>Stolen goods, or devices that are reported lost or blacklisted.</li>
          <li>
            Locked devices can only be bought as grade C or D for parts or scrap, and are never
            resold whole.
          </li>
          <li>Counterfeit items, or items that infringe someone else&apos;s rights.</li>
          <li>Anything whose sale is prohibited by Indian law.</li>
        </ul>
      </section>

      <section>
        <h2>E-waste and recycling</h2>
        <p>
          End-of-life electronics are subject to the E-Waste (Management) Rules, 2022. Scrap and
          items we can&apos;t reuse (grade D, dead or hazardous), and every battery, are handed to
          VRRG Group, Gangyal, our dismantling partner, by weight on a weight receipt; they are not
          resold for reuse. Dead e-waste from an institution goes to VRRG Group on its receipt in
          the institution&apos;s name.
        </p>
      </section>

      <section>
        <h2>Buying from ReLoop</h2>
        <p>
          A reservation is not a sale. A sale is agreed when ReLoop confirms the item, price and
          pickup or delivery with you. Grade A and B devices carry a 30-day warranty, and parts a
          7-day return, described on our Warranty &amp; returns page. We deliver in Jammu city only.
          Please inspect items when you collect or receive them.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          Used items are sold as described, and we take reasonable care to check them. To the extent
          the law allows, ReLoop is not liable for indirect losses, or for losses caused by
          information a seller provided. Nothing in these terms limits rights you have under the
          Consumer Protection Act, 2019.
        </p>
      </section>

      <section>
        <h2>Privacy</h2>
        <p>
          How we handle personal data is explained in our{" "}
          <Link href="/privacy" className="font-medium text-brand-600 underline">
            privacy policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>Law and disputes</h2>
        <p>
          These terms are governed by the laws of India. Courts in Jammu, Jammu &amp; Kashmir have
          jurisdiction, subject to any rights you have under consumer protection law.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms:{" "}
          <ContactDetail value={site.supportEmail} href={(v) => `mailto:${v}`} />
        </p>
      </section>
    </LegalPage>
  );
}

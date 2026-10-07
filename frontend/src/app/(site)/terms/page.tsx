import type { Metadata } from "next";
import Link from "next/link";
import { ContactDetail, LegalPage } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for buying from and selling to ReLoop.",
};

export default function TermsPage() {
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
          and resells what can be reused. During the early preview, items shown in the shop are
          samples and no sales are processed.
        </p>
      </section>

      <section>
        <h2>Selling to ReLoop</h2>
        <ul>
          <li>Only sell items you own or have the right to sell.</li>
          <li>
            Prices shown on this site are estimates. The final price is set after we test the item,
            and you may decline it.
          </li>
          <li>
            Remove personal data where you can. We also wipe phones, laptops and drives before
            resale.
          </li>
          <li>
            Consignment items are sold on terms we agree with you in writing before you hand them
            over.
          </li>
        </ul>
      </section>

      <section>
        <h2>Items we do not accept</h2>
        <ul>
          <li>Stolen goods, or devices that are locked, blacklisted or reported lost.</li>
          <li>Counterfeit items, or items that infringe someone else&apos;s rights.</li>
          <li>Anything whose sale is prohibited by Indian law.</li>
        </ul>
      </section>

      <section>
        <h2>E-waste and recycling</h2>
        <p>
          End-of-life electronics must be handled only through channels authorised under the E-Waste
          (Management) Rules, 2022. Items in the Recycling category are routed to authorised
          recyclers; they are not resold for reuse.
        </p>
      </section>

      <section>
        <h2>Buying from ReLoop</h2>
        <p>
          A reservation is not a sale. A sale is agreed when ReLoop confirms the item, price and
          pickup or delivery with you. Grade A and B devices carry a warranty described on our
          Warranty &amp; delivery page. Please inspect items when you collect or receive them.
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
          <ContactDetail value={SITE.supportEmail} href={(v) => `mailto:${v}`} />
        </p>
      </section>
    </LegalPage>
  );
}

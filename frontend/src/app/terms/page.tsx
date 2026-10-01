import type { Metadata } from "next";
import Link from "next/link";
import { ContactDetail, LegalPage } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for buying and selling on the ReLoop marketplace.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated={SITE.legalUpdated}>
      <section>
        <h2>About these terms</h2>
        <p>
          These terms apply when you use the ReLoop marketplace, run by{" "}
          {SITE.legalName ?? SITE.name}. By using the site you agree to them. If you do not agree,
          please do not use ReLoop.
        </p>
      </section>

      <section>
        <h2>What ReLoop does</h2>
        <p>
          ReLoop is a managed marketplace for used electronics, components and bulk lots. Buyers
          browse listings and send inquiries; ReLoop confirms availability and condition and
          coordinates sales. During the early preview, listings may be sample data and no online
          payments, pickups or recycling services are processed.
        </p>
      </section>

      <section>
        <h2>Accounts</h2>
        <ul>
          <li>You must be 18 or older and give accurate information.</li>
          <li>
            You are responsible for activity on your account. Tell us promptly if you suspect
            misuse.
          </li>
          <li>We may suspend accounts that break these terms or put other users at risk.</li>
        </ul>
      </section>

      <section>
        <h2>Listing items</h2>
        <ul>
          <li>
            Only list items you own or have the right to sell, and describe their condition
            honestly.
          </li>
          <li>Wipe personal data from devices before handing them over.</li>
          <li>
            Listings from individuals are reviewed by ReLoop before they go live. Verified partner
            organisations can publish directly, but remain responsible for accuracy.
          </li>
          <li>
            We may edit, decline or remove any listing that is inaccurate, unsafe or unlawful.
          </li>
        </ul>
      </section>

      <section>
        <h2>Items that are not allowed</h2>
        <ul>
          <li>Stolen goods, or devices that are locked, blacklisted or reported lost.</li>
          <li>Counterfeit items, or items that infringe someone else&apos;s rights.</li>
          <li>Damaged, swollen or leaking batteries offered for reuse.</li>
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
        <h2>Buying</h2>
        <p>
          Inquiries are not orders. A sale is agreed only when ReLoop confirms the item, price,
          condition and delivery with you. Inspect items on delivery or collection and raise any
          issue promptly.
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

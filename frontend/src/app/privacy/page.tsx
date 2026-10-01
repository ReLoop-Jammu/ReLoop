import type { Metadata } from "next";
import { ContactDetail, LegalPage } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How ReLoop collects, uses and protects your personal data.",
};

export default function PrivacyPage() {
  const officer = SITE.grievanceOfficer;
  return (
    <LegalPage title="Privacy policy" updated={SITE.legalUpdated}>
      <section>
        <h2>Who we are</h2>
        <p>
          {SITE.legalName ?? SITE.name} (&quot;ReLoop&quot;, &quot;we&quot;) runs this marketplace
          for used electronics, based in {SITE.city}. This policy explains what personal data we
          collect, why, and the choices you have. We follow India&apos;s Digital Personal Data
          Protection Act, 2023 (DPDP Act).
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address and, if you choose to give
            it, phone number.
          </li>
          <li>
            <strong>Listings you create:</strong> item details, photos, location (city) and, for
            businesses, organisation details such as name and GSTIN.
          </li>
          <li>
            <strong>Inquiries:</strong> the name, contact details and message you send about a
            listing.
          </li>
          <li>
            <strong>Technical data:</strong> essential cookies that keep you signed in, and
            anonymous, aggregated usage statistics (pages viewed, page speed) that do not identify
            you.
          </li>
        </ul>
        <p>We do not collect payment card details. We do not sell your personal data.</p>
      </section>

      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To run your account and show your listings to buyers.</li>
          <li>
            To review listings and verify partner organisations, keeping the marketplace
            trustworthy.
          </li>
          <li>To pass inquiries to ReLoop staff so they can respond and arrange sales.</li>
          <li>
            To send emails you need, such as sign-in links and updates on your listings or
            inquiries.
          </li>
          <li>To keep the service secure, prevent spam and fix problems.</li>
        </ul>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>
          We use trusted service providers to run the site: hosting, database and file storage,
          email delivery, spam protection and error monitoring. They process data only on our
          instructions. Your contact details are not shown publicly on listings; inquiries go to
          ReLoop, not directly to other users. We may disclose data if required by law.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep account data while your account is active. If you delete your account, we delete
          or anonymise your personal data within a reasonable period, except where we must keep
          records by law (for example, tax or e-waste compliance records).
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>Under the DPDP Act you can:</p>
        <ul>
          <li>ask what personal data we hold about you and how it is used;</li>
          <li>ask us to correct, complete or update it;</li>
          <li>ask us to erase it, and withdraw consent you have given;</li>
          <li>nominate someone to exercise these rights on your behalf;</li>
          <li>raise a grievance with us, and then with the Data Protection Board of India.</li>
        </ul>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          ReLoop is not intended for anyone under 18. We do not knowingly collect data from
          children.
        </p>
      </section>

      <section>
        <h2>Contact and grievances</h2>
        <p>
          Grievance officer: {officer ? officer.name : <ContactDetail value={null} />}
          <br />
          Email:{" "}
          <ContactDetail value={officer?.email ?? SITE.supportEmail} href={(v) => `mailto:${v}`} />
          {SITE.address && (
            <>
              <br />
              Address: {SITE.address}
            </>
          )}
        </p>
        <p>We aim to acknowledge grievances within 24 hours and resolve them within 15 days.</p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If we make significant changes, we will update the date above and let account holders
          know.
        </p>
      </section>
    </LegalPage>
  );
}

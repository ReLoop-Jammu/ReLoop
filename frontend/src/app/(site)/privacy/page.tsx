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
          {SITE.legalName ?? SITE.name} (&quot;ReLoop&quot;, &quot;we&quot;) buys, grades and
          resells used electronics for used electronics, based in {SITE.city}. This policy explains
          what personal data we collect, why, and the choices you have. We follow India&apos;s
          Digital Personal Data Protection Act, 2023 (DPDP Act).
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>When you sell to us:</strong> your name, phone number, and, for shops and
            institutions, the business name, market or address and a contact person. We also record
            the items you hand over and what we paid for them.
          </li>
          <li>
            <strong>When you buy or reserve an item:</strong> your name, phone number, and your
            delivery area if you choose delivery.
          </li>
          <li>
            <strong>Requests you send us</strong> through the forms on this site, by WhatsApp or by
            email.
          </li>
          <li>
            <strong>Technical data:</strong> anonymous, aggregated usage statistics (pages viewed,
            page speed) that do not identify you.
          </li>
        </ul>
        <p>
          We do not collect payment card details, and we do not sell your personal data. Data stored
          on devices you sell us is wiped before resale, as described on our How it works page.
        </p>
      </section>

      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To arrange pickups, drop-offs and payments when you sell to us.</li>
          <li>To reserve items, arrange delivery and honour warranties when you buy from us.</li>
          <li>To keep records of where items came from and where recycled material went.</li>
          <li>To answer your questions and keep the service secure.</li>
        </ul>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>
          We use trusted service providers to run the site, such as hosting and messaging. They
          process data only on our instructions. For institutions, the institution&apos;s name
          appears on the recycler&apos;s weight receipt. We may disclose data if required by law.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep your details while we have an active relationship with you. When you ask us to
          delete them, we do so within a reasonable period, except where we must keep records by law
          (for example, tax or e-waste compliance records).
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
        <p>If we make significant changes, we will update the date above.</p>
      </section>
    </LegalPage>
  );
}
